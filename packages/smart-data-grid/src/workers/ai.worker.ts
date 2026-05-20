// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextGenerationPipeline = any;
import { pipeline, env } from '@huggingface/transformers';

// Persist model files in the browser's Cache API across page loads
env.useBrowserCache = true;
env.allowLocalModels = false;

type IncomingMessage =
  | { type: 'INIT' }
  | { type: 'RUN_QUERY'; schema: string; userInput: string }
  | { type: 'EXTRACT_JSON'; schema: string; userInput: string };

let generator: TextGenerationPipeline | null = null;

const SYSTEM_PROMPT = `You are a JavaScript code generator. Output ONLY a single arrow function expression. Nothing else.

Schema fields: {SCHEMA}

Rules:
- Output must start with: (data) =>
- Use only: .filter(), .map(), .sort(), .slice()
- No imports, no declarations, no explanations, no markdown
- String comparisons must use .toLowerCase()

Example output:
(data) => data.filter(row => row.age > 30).sort((a, b) => a.name.localeCompare(b.name))`;

// Code-tuned variant — same size (~300MB) but trained specifically for code generation
const MODEL_ID = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';

async function initModel(): Promise<void> {
  const progressCallback = (progressInfo: { progress?: number; status?: string }) => {
    const pct = progressInfo.progress ?? 0;
    self.postMessage({ type: 'PROGRESS', progress: Math.round(pct) });
  };

  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
  const hasWebGPU = !!nav.gpu && !!(await nav.gpu.requestAdapter().catch(() => null));

  try {
    if (hasWebGPU) {
      generator = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q4f16',
        progress_callback: progressCallback,
      });
    } else {
      generator = await pipeline('text-generation', MODEL_ID, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progressCallback,
      });
    }
    self.postMessage({ type: 'READY' });
  } catch (err) {
    // If WebGPU dtype failed, retry with WASM
    if (hasWebGPU) {
      try {
        generator = await pipeline('text-generation', MODEL_ID, {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: progressCallback,
        });
        self.postMessage({ type: 'READY' });
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to initialize AI model';
        self.postMessage({ type: 'ERROR', message });
      }
    } else {
      const message = err instanceof Error ? err.message : 'Failed to initialize AI model';
      self.postMessage({ type: 'ERROR', message });
    }
  }
}

/**
 * Rule-based fallback for common filter/sort patterns.
 * Returns a valid arrow function string, or null if no pattern matched.
 */
function ruleBasedParse(input: string, fields: string[]): string | null {
  const q = input.toLowerCase().trim();
  const parts: string[] = [];

  // --- filter: field > number ---
  const gtMatch = q.match(/(\w+)\s*(?:older than|greater than|more than|above|>)\s*(\d+)/);
  if (gtMatch) {
    const field = fields.find(f => f.toLowerCase() === gtMatch[1]) ?? gtMatch[1];
    parts.push(`row => row.${field} > ${gtMatch[2]}`);
  }

  // --- filter: field < number ---
  const ltMatch = q.match(/(\w+)\s*(?:younger than|less than|below|under|<)\s*(\d+)/);
  if (ltMatch) {
    const field = fields.find(f => f.toLowerCase() === ltMatch[1]) ?? ltMatch[1];
    parts.push(`row => row.${field} < ${ltMatch[2]}`);
  }

  // --- filter: field = string ---
  const eqMatch = q.match(/(?:in|from|with|is|=)\s+["']?([a-z][a-z\s]*)["']?/);
  if (eqMatch && !gtMatch && !ltMatch) {
    const value = eqMatch[1].trim();
    const guessedField = fields.find(f =>
      ['city', 'role', 'department', 'country', 'status', 'type'].includes(f.toLowerCase())
    );
    if (guessedField) {
      parts.push(`row => row.${guessedField}.toLowerCase() === '${value.toLowerCase()}'`);
    }
  }

  const filterExpr = parts.length > 0
    ? `.filter(${parts.join(' && ')})`
    : '';

  // --- sort ---
  let sortExpr = '';
  const sortMatch = q.match(/sort(?:ed)?\s+by\s+(\w+)(?:\s+(desc|asc))?/);
  if (sortMatch) {
    const field = fields.find(f => f.toLowerCase() === sortMatch[1]) ?? sortMatch[1];
    const dir = sortMatch[2] === 'desc' ? -1 : 1;
    sortExpr = `.sort((a, b) => {
      const av = a.${field}; const bv = b.${field};
      if (typeof av === 'number') return (av - bv) * ${dir};
      return String(av).localeCompare(String(bv)) * ${dir};
    })`;
  }

  if (!filterExpr && !sortExpr) return null;
  return `(data) => data${filterExpr}${sortExpr}`;
}

async function runQuery(schema: string, userInput: string): Promise<void> {
  if (!generator) {
    self.postMessage({
      type: 'ERROR',
      message: 'Model not initialized. Please wait for initialization to complete.',
    });
    return;
  }

  const systemContent = SYSTEM_PROMPT.replace('{SCHEMA}', schema);

  const messages = [
    { role: 'system', content: systemContent },
    { role: 'user', content: `Request: ${userInput}\nOutput:` },
  ];

  try {
    const output = await generator(messages, {
      max_new_tokens: 256,
      do_sample: false,
      temperature: 0.1,
    });

    let code = '';

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (
        first &&
        typeof first === 'object' &&
        'generated_text' in first
      ) {
        const generated = first.generated_text;
        if (Array.isArray(generated) && generated.length > 0) {
          const last = generated[generated.length - 1];
          if (last && typeof last === 'object' && 'content' in last) {
            code = String(last.content);
          }
        } else if (typeof generated === 'string') {
          code = generated;
        }
      }
    }

    // Strip markdown fences
    code = code
      .replace(/```(?:javascript|js)?\n?/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract the arrow function — find the first (data) => ... occurrence
    const arrowMatch = code.match(/\(data\)\s*=>.+/s);
    if (arrowMatch) {
      code = arrowMatch[0].trim();
    }

    // Validate — if LLM output is broken, try rule-based fallback
    try {
      new Function('data', `return (${code})([])`);
    } catch {
      const fields = schema.split(',').map(s => s.trim());
      const fallback = ruleBasedParse(userInput, fields);
      if (fallback) {
        self.postMessage({ type: 'QUERY_RESULT', code: fallback });
        return;
      }
      self.postMessage({
        type: 'ERROR',
        message: `Could not parse query. Try: "filter by age > 30, sort by name"`,
      });
      return;
    }

    self.postMessage({ type: 'QUERY_RESULT', code });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Inference failed';
    self.postMessage({ type: 'ERROR', message });
  }
}

const JSON_EXTRACT_SYSTEM_PROMPT = `You are a data extraction assistant. Extract information from the provided text and return ONLY a valid JSON object matching the given schema fields. No explanation, no markdown, just the JSON object.`;

async function extractJSON(schema: string, userInput: string): Promise<void> {
  if (!generator) {
    self.postMessage({
      type: 'ERROR',
      message: 'Model not initialized. Please wait for initialization to complete.',
    });
    return;
  }

  const messages = [
    { role: 'system', content: `${JSON_EXTRACT_SYSTEM_PROMPT}\n\nSchema fields (JSON): ${schema}` },
    { role: 'user', content: userInput },
  ];

  try {
    const output = await generator(messages, {
      max_new_tokens: 512,
      do_sample: false,
      temperature: 0.1,
    });

    let raw = '';

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (first && typeof first === 'object' && 'generated_text' in first) {
        const generated = first.generated_text;
        if (Array.isArray(generated) && generated.length > 0) {
          const last = generated[generated.length - 1];
          if (last && typeof last === 'object' && 'content' in last) {
            raw = String(last.content);
          }
        } else if (typeof generated === 'string') {
          raw = generated;
        }
      }
    }

    // Strip markdown fences if the model wraps in ```json ... ```
    raw = raw
      .replace(/```(?:json)?\n?/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract the first {...} block
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      self.postMessage({ type: 'JSON_RESULT', data: {} });
      return;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
      self.postMessage({ type: 'JSON_RESULT', data: parsed });
    } catch {
      self.postMessage({ type: 'JSON_RESULT', data: {} });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JSON extraction failed';
    self.postMessage({ type: 'ERROR', message });
  }
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'INIT':
      await initModel();
      break;

    case 'RUN_QUERY':
      await runQuery(msg.schema, msg.userInput);
      break;

    case 'EXTRACT_JSON':
      await extractJSON(msg.schema, msg.userInput);
      break;
  }
};
