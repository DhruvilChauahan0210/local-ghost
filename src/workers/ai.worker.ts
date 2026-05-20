import { pipeline, env, type TextGenerationPipeline } from '@huggingface/transformers';

// Persist model files in the browser's Cache API across page loads
env.useBrowserCache = true;
env.allowLocalModels = false;

type IncomingMessage =
  | { type: 'INIT' }
  | { type: 'RUN_QUERY'; schema: string; userInput: string };

let generator: TextGenerationPipeline | null = null;

const SYSTEM_PROMPT = `You are a deterministic, zero-dependency JavaScript data execution compiler.
Your input is:
1. A dataset schema layout: {SCHEMA}
2. A user manipulation request written in plain English.

Your task is to write a single, isolated, vanilla JavaScript anonymous arrow function that executes array operations (.filter, .map, .sort, or .slice) on an array variable named 'data'.

OUTPUT COMPLIANCE LAWS:
- Return ONLY the executable JavaScript string.
- Do NOT wrap code blocks in markdown fences (e.g., no \`\`\`js).
- Do NOT output conversational sentences, text introductions, or code explanations.
- The returned code must evaluate to a clean, structural array format matching the original schema.`;

async function initModel(): Promise<void> {
  const model = 'Xenova/Qwen1.5-0.5B-Chat';

  const progressCallback = (progressInfo: { progress?: number; status?: string }) => {
    const pct = progressInfo.progress ?? 0;
    self.postMessage({ type: 'PROGRESS', progress: Math.round(pct) });
  };

  let device: 'webgpu' | 'wasm' = 'webgpu';

  try {
    // Verify WebGPU is actually usable
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No WebGPU adapter found');
    }
  } catch {
    device = 'wasm';
    self.postMessage({
      type: 'PROGRESS',
      progress: 0,
    });
  }

  try {
    generator = await pipeline('text-generation', model, {
      device,
      progress_callback: progressCallback,
    }) as TextGenerationPipeline;

    self.postMessage({ type: 'READY' });
  } catch (err) {
    if (device === 'webgpu') {
      // Fallback to wasm if webgpu pipeline init fails
      try {
        generator = await pipeline('text-generation', model, {
          device: 'wasm',
          progress_callback: progressCallback,
        }) as TextGenerationPipeline;

        self.postMessage({ type: 'READY' });
      } catch (fallbackErr) {
        const message =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : 'Failed to initialize AI model';
        self.postMessage({ type: 'ERROR', message });
      }
    } else {
      const message =
        err instanceof Error ? err.message : 'Failed to initialize AI model';
      self.postMessage({ type: 'ERROR', message });
    }
  }
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
    { role: 'user', content: userInput },
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

    // Strip any accidental markdown fences the model may emit
    code = code
      .replace(/```(?:javascript|js)?\n?/gi, '')
      .replace(/```/g, '')
      .trim();

    self.postMessage({ type: 'QUERY_RESULT', code });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Inference failed';
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
  }
};
