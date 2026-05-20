// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextGenerationPipeline = any;
import { pipeline, env } from '@huggingface/transformers';

env.useBrowserCache = true;
env.allowLocalModels = false;

type IncomingMessage =
  | { type: 'INIT' }
  | { type: 'RUN_QUERY';    schema: string; userInput: string }
  | { type: 'EXTRACT_JSON'; schema: string; userInput: string }
  | { type: 'ANALYZE_DATA'; schema: string; userInput: string };

let generator: TextGenerationPipeline | null = null;

const MODEL_ID = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';

// ── Model init ────────────────────────────────────────────────────────────────
async function initModel(): Promise<void> {
  const cb = (p: { progress?: number }) =>
    self.postMessage({ type: 'PROGRESS', progress: Math.round(p.progress ?? 0) });

  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
  const hasWebGPU = !!nav.gpu && !!(await nav.gpu.requestAdapter().catch(() => null));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tryInit = async (device: 'webgpu' | 'wasm', dtype: any) => {
    generator = await pipeline('text-generation', MODEL_ID, {
      device, dtype, progress_callback: cb as any,
    });
    self.postMessage({ type: 'READY' });
  };

  try {
    await tryInit(hasWebGPU ? 'webgpu' : 'wasm', hasWebGPU ? 'q4f16' : 'q8');
  } catch {
    if (hasWebGPU) {
      try { await tryInit('wasm', 'q8'); }
      catch (e) { self.postMessage({ type: 'ERROR', message: e instanceof Error ? e.message : 'Init failed' }); }
    } else {
      self.postMessage({ type: 'ERROR', message: 'Failed to load model' });
    }
  }
}

// ── Shared output extractor ───────────────────────────────────────────────────
function extractOutput(output: unknown): string {
  if (!Array.isArray(output) || output.length === 0) return '';
  const first = output[0];
  if (!first || typeof first !== 'object' || !('generated_text' in first)) return '';
  const gen = (first as { generated_text: unknown }).generated_text;
  if (Array.isArray(gen) && gen.length > 0) {
    const last = gen[gen.length - 1];
    if (last && typeof last === 'object' && 'content' in last) return String((last as { content: unknown }).content);
  }
  if (typeof gen === 'string') return gen;
  return '';
}

function stripFences(raw: string): string {
  return raw.replace(/```(?:javascript|js|json)?\n?/gi, '').replace(/```/g, '').trim();
}

// ── SmartDataGrid: generate JS arrow function ─────────────────────────────────
const GRID_PROMPT = `You are a JavaScript code generator. Output ONLY a single arrow function. Nothing else.

Schema fields: {SCHEMA}

Rules:
- Must start with: (data) =>
- Use only: .filter(), .map(), .sort(), .slice()
- No imports, no declarations, no explanations, no markdown
- String comparisons must use .toLowerCase()

Example: (data) => data.filter(row => row.age > 30).sort((a, b) => a.name.localeCompare(b.name))`;

// Rule-based is ONLY used to fix syntactically broken AI output — not as a semantic fallback
function fixBrokenArrowFn(input: string, fields: string[]): string | null {
  const q = input.toLowerCase();
  const parts: string[] = [];
  const gtM = q.match(/(\w+)\s*(?:older than|greater than|more than|above|>)\s*(\d+)/);
  if (gtM) {
    const f = fields.find(f => f.toLowerCase() === gtM[1]) ?? gtM[1];
    parts.push(`row => row.${f} > ${gtM[2]}`);
  }
  const ltM = q.match(/(\w+)\s*(?:younger than|less than|below|under|<)\s*(\d+)/);
  if (ltM) {
    const f = fields.find(f => f.toLowerCase() === ltM[1]) ?? ltM[1];
    parts.push(`row => row.${f} < ${ltM[2]}`);
  }
  const sortM = q.match(/sort(?:ed)?\s+by\s+(\w+)(?:\s+(desc|asc))?/);
  const sortExpr = sortM
    ? `.sort((a,b)=>{ const f='${fields.find(f=>f.toLowerCase()===sortM[1])??sortM[1]}'; const av=a[f],bv=b[f]; if(typeof av==='number')return (av-bv)*${sortM[2]==='desc'?-1:1}; return String(av).localeCompare(String(bv))*${sortM[2]==='desc'?-1:1}; })`
    : '';
  if (!parts.length && !sortExpr) return null;
  return `(data) => data${parts.length ? `.filter(${parts[0]})` : ''}${sortExpr}`;
}

async function runQuery(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'ERROR', message: 'Model not ready' }); return; }

  const messages = [
    { role: 'system', content: GRID_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user', content: `Request: ${userInput}\nOutput:` },
  ];

  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 200, do_sample: false, temperature: 0.1 })));
    const arrowMatch = raw.match(/\(data\)\s*=>.+/s);
    const code = arrowMatch ? arrowMatch[0].trim() : raw;

    try {
      new Function('data', `return (${code})([])`);
      self.postMessage({ type: 'QUERY_RESULT', code, usedFallback: false });
    } catch {
      // AI produced syntactically invalid JS — attempt to repair from original query
      const fixed = fixBrokenArrowFn(userInput, schema.split(',').map(s => s.trim()));
      if (fixed) {
        self.postMessage({ type: 'QUERY_RESULT', code: fixed, usedFallback: true });
      } else {
        self.postMessage({ type: 'ERROR', message: 'AI produced invalid code. Try rephrasing your query.' });
      }
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : 'Inference failed' });
  }
}

// ── SmartForm: extract fields as JSON ────────────────────────────────────────
const FORM_PROMPT = `Extract information from the text and return ONLY a valid JSON object.
Schema fields: {SCHEMA}
Rules: Return only field values that are clearly present. Use null for missing fields. No explanation, no markdown.
Example schema: [{"name":"email","type":"email"}]
Example output: {"email":"alice@example.com"}`;

async function extractJSON(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'ERROR', message: 'Model not ready' }); return; }

  const messages = [
    { role: 'system', content: FORM_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user', content: `Text: """${userInput}"""\nOutput:` },
  ];

  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 300, do_sample: false, temperature: 0.1 })));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { self.postMessage({ type: 'JSON_RESULT', data: {} }); return; }
    try {
      self.postMessage({ type: 'JSON_RESULT', data: JSON.parse(jsonMatch[0]) });
    } catch {
      self.postMessage({ type: 'JSON_RESULT', data: {} });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : 'Extraction failed' });
  }
}

// ── SmartAnalytics: AI decides intent + parameters ────────────────────────────
const ANALYZE_PROMPT = `You are a data analysis AI. Dataset columns: {SCHEMA}

Decide if the user wants a CHART (aggregate/visualize) or a FILTER (list matching rows), then output ONLY valid JSON.

CHART examples: "average salary by role", "count by city", "salary distribution pie"
FILTER examples: "employees with salary more than 100000", "show engineers", "list people older than 35"

For CHART output exactly this shape:
{"action":"chart","type":"bar","xKey":"role","yKey":"salary","aggregation":"avg","title":"Average Salary by Role"}

For FILTER output exactly this shape:
{"action":"filter","field":"salary","op":">","value":100000,"title":"Employees with salary over 100k"}

Valid type values: bar, line, pie
Valid aggregation values: count, avg, sum, max, min
Valid op values: >, <, =, contains

Output ONLY the JSON object. No other text.`;

async function analyzeData(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'ERROR', message: 'Model not ready' }); return; }

  const messages = [
    { role: 'system', content: ANALYZE_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user', content: `Query: "${userInput}"\nOutput:` },
  ];

  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 150, do_sample: false, temperature: 0.1 })));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      self.postMessage({ type: 'ERROR', message: 'AI could not interpret query. Try: "average salary by role" or "employees with salary > 100000"' });
      return;
    }
    try {
      const result = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      if (result['action'] !== 'chart' && result['action'] !== 'filter') {
        self.postMessage({ type: 'ERROR', message: 'AI returned an unrecognized action. Try rephrasing.' });
        return;
      }
      self.postMessage({ type: 'ANALYSIS_RESULT', result });
    } catch {
      self.postMessage({ type: 'ERROR', message: 'AI output was not valid JSON. Try rephrasing your query.' });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : 'Analysis failed' });
  }
}

// ── Message router ────────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'INIT':          await initModel(); break;
    case 'RUN_QUERY':     await runQuery(msg.schema, msg.userInput); break;
    case 'EXTRACT_JSON':  await extractJSON(msg.schema, msg.userInput); break;
    case 'ANALYZE_DATA':  await analyzeData(msg.schema, msg.userInput); break;
  }
};
