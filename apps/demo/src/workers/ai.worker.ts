// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextGenerationPipeline = any;
import { pipeline, env } from '@huggingface/transformers';

env.useBrowserCache = true;
env.allowLocalModels = false;

// Suppress ONNX WASM binary warnings — expected for quantized models
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('[W:onnxruntime:') || msg.includes('VerifyEachNodeIsAssignedToAnEp')) return;
  _warn(...args);
};

type IncomingMessage =
  | { type: 'INIT' }
  | { type: 'RUN_QUERY';    schema: string; userInput: string }
  | { type: 'EXTRACT_JSON'; schema: string; userInput: string }
  | { type: 'ANALYZE_DATA'; schema: string; userInput: string };

// ERROR        = init-level failure: AI goes to 'error' state, cannot recover
// QUERY_ERROR  = query-level failure: AI stays 'ready', only this request failed
// JSON_ERROR   = extraction-level failure: AI stays 'ready'
// ANALYSIS_ERROR = analysis-level failure: AI stays 'ready'

let generator: TextGenerationPipeline | null = null;
const MODEL_ID = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';

// ── VRAM idle timer — disposes model after 5 min of inactivity ───────────────
const IDLE_MS = 5 * 60 * 1000;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (generator) {
      if (typeof generator.dispose === 'function') await generator.dispose();
      generator = null;
      log('VRAM purged after 5 min idle. Re-enable AI to reload.');
      self.postMessage({ type: 'SYSTEM_STATUS', status: 'disposed' });
    }
  }, IDLE_MS);
}

// ── Terminal log helper ───────────────────────────────────────────────────────
function log(msg: string): void {
  self.postMessage({ type: 'LOG', message: `[LG_SYSTEM] ${msg}` });
}

// ── Model init ────────────────────────────────────────────────────────────────
async function initModel(): Promise<void> {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
  const hasWebGPU = !!nav.gpu && !!(await nav.gpu.requestAdapter().catch(() => null));

  log(`Initializing Web Worker core... SUCCESS`);
  log(`Querying CacheStorage for ${MODEL_ID}...`);

  let lastFile = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cb = (p: any) => {
    const pct = Math.round(p.progress ?? 0);
    self.postMessage({ type: 'PROGRESS', progress: pct });
    if (p.status === 'initiate' && p.file !== lastFile) {
      lastFile = p.file ?? '';
      log(`Loading: ${lastFile}`);
    }
    if (p.status === 'download') log(`Downloading model chunk... ${pct}% complete`);
    if (p.status === 'ready')    log(`Component ready: ${p.file ?? 'model'}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tryInit = async (device: 'webgpu' | 'wasm', dtype: any) => {
    if (device === 'webgpu') log(`Allocating WebGPU command buffers and VRAM shaders...`);
    else                     log(`Starting WASM inference engine (WebGPU unavailable)...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generator = await pipeline('text-generation', MODEL_ID, { device, dtype, progress_callback: cb as any });
    log(`Local Ghost is active. Running on ${device.toUpperCase()}.`);
    self.postMessage({ type: 'READY', device });
    resetIdleTimer();
  };

  try {
    await tryInit(hasWebGPU ? 'webgpu' : 'wasm', hasWebGPU ? 'q4f16' : 'q8');
  } catch {
    if (hasWebGPU) {
      try {
        log(`WebGPU init failed. Falling back to WASM...`);
        await tryInit('wasm', 'q8');
      } catch (e) {
        self.postMessage({ type: 'ERROR', message: e instanceof Error ? e.message : 'Init failed' });
      }
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
    if (last && typeof last === 'object' && 'content' in last)
      return String((last as { content: unknown }).content);
  }
  if (typeof gen === 'string') return gen;
  return '';
}

function stripFences(raw: string): string {
  return raw.replace(/```(?:javascript|js|json)?\n?/gi, '').replace(/```/g, '').trim();
}

// ── SmartDataGrid ─────────────────────────────────────────────────────────────
const GRID_PROMPT = `You are a JavaScript code generator. Output ONLY a single arrow function. Nothing else.

Schema fields: {SCHEMA}

Rules:
- Must start with: (data) =>
- Use only: .filter(), .map(), .sort(), .slice()
- No imports, no declarations, no explanations, no markdown
- String comparisons: use .toLowerCase() and .includes() for partial matches
- For role/job/department/city filters: prefer .includes() not ===

Example: (data) => data.filter(row => row.age > 30).sort((a, b) => a.name.localeCompare(b.name))
Example: (data) => data.filter(row => row.role.toLowerCase().includes('engineer'))`;

const STRING_FIELDS = ['city', 'role', 'department', 'country', 'status', 'type', 'job', 'title', 'category', 'gender', 'team', 'name'];

function fixBrokenArrowFn(input: string, fields: string[]): string | null {
  const q = input.toLowerCase().trim();
  const parts: string[] = [];

  // field > number
  const gtM = q.match(/(\w+)\s*(?:older than|greater than|more than|above|>)\s*(\d+)/);
  if (gtM) {
    const f = fields.find(f => f.toLowerCase() === gtM[1]) ?? gtM[1];
    parts.push(`row.${f} > ${gtM[2]}`);
  }

  // field < number
  const ltM = q.match(/(\w+)\s*(?:younger than|less than|below|under|<)\s*(\d+)/);
  if (ltM) {
    const f = fields.find(f => f.toLowerCase() === ltM[1]) ?? ltM[1];
    parts.push(`row.${f} < ${ltM[2]}`);
  }

  // top N
  const topM = q.match(/top\s+(\d+)/);

  // sort
  const sortM = q.match(/sort(?:ed)?\s+by\s+(\w+)(?:\s+(desc|asc))?/);
  const sortField = sortM ? (fields.find(f => f.toLowerCase() === sortM[1]) ?? sortM[1]) : null;
  const sortDir   = sortM?.[2] === 'desc' ? -1 : 1;
  const sortExpr  = sortField
    ? `.sort((a,b)=>{ const av=a['${sortField}'],bv=b['${sortField}']; if(typeof av==='number')return (av-bv)*${sortDir}; return String(av).localeCompare(String(bv))*${sortDir}; })`
    : '';

  // "in X" / "from X" / "is X"
  const eqM = q.match(/(?:in|from|with|is|=)\s+["']?([a-z][a-z\s]*)["']?/);
  if (eqM && !gtM && !ltM) {
    const value = eqM[1].trim();
    const sf = fields.find(f => STRING_FIELDS.includes(f.toLowerCase()));
    if (sf) parts.push(`String(row['${sf}']).toLowerCase().includes('${value.toLowerCase()}')`);
  }

  // "show only X" / "only X" / "filter X" / "find X" / "list X" / bare noun
  if (!gtM && !ltM && !eqM) {
    const showM = q.match(/(?:show\s+only|only|filter|find|list|get|display)\s+([a-z][a-z\s]*)$/);
    const bareM = !showM ? q.match(/^([a-z][a-z\s]*)(?:\s+only)?$/) : null;
    const rawVal = ((showM ? showM[1] : null) ?? (bareM ? bareM[1] : null) ?? '').trim().replace(/s$/, '');
    if (rawVal && rawVal.length > 2) {
      const sf = fields.find(f => STRING_FIELDS.includes(f.toLowerCase()));
      if (sf) parts.push(`String(row['${sf}']).toLowerCase().includes('${rawVal.toLowerCase()}')`);
    }
  }

  if (!parts.length && !sortExpr && !topM) return null;

  const filterExpr = parts.length ? `.filter(row => ${parts.join(' && ')})` : '';
  const sliceExpr  = topM ? `.slice(0, ${topM[1]})` : '';

  // If top N without sort, sort by first numeric field descending
  const autoSort = topM && !sortM
    ? (() => {
        const numField = fields.find(f => !['id','name'].includes(f.toLowerCase()));
        return numField
          ? `.sort((a,b)=>Number(b['${numField}'])-Number(a['${numField}']))`
          : '';
      })()
    : '';

  return `(data) => data${filterExpr}${autoSort}${sortExpr}${sliceExpr}`;
}

async function runQuery(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'QUERY_ERROR', message: 'Model not ready' }); return; }
  resetIdleTimer();
  const messages = [
    { role: 'system', content: GRID_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user',   content: `Request: ${userInput}\nOutput:` },
  ];
  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 200, do_sample: false, temperature: 0.1 })));
    const arrowMatch = raw.match(/\(data\)\s*=>.+/s);
    const code = arrowMatch ? arrowMatch[0].trim() : raw;
    try {
      new Function('data', `return (${code})([])`);
      self.postMessage({ type: 'QUERY_RESULT', code, usedFallback: false });
    } catch {
      const fixed = fixBrokenArrowFn(userInput, schema.split(',').map(s => s.trim()));
      if (fixed) {
        self.postMessage({ type: 'QUERY_RESULT', code: fixed, usedFallback: true });
      } else {
        self.postMessage({
          type: 'QUERY_ERROR',
          message: `Could not parse "${userInput}". Try: "age > 30", "sort by salary desc", "show only engineers"`,
        });
      }
    }
  } catch (err) {
    self.postMessage({ type: 'QUERY_ERROR', message: err instanceof Error ? err.message : 'Inference failed' });
  }
}

// ── SmartForm ─────────────────────────────────────────────────────────────────
const FORM_PROMPT = `Extract information from the text and return ONLY a valid JSON object.
Schema fields: {SCHEMA}
Rules: Return only field values that are clearly present. Use null for missing fields. No explanation, no markdown.
Example schema: [{"name":"email","type":"email"}]
Example output: {"email":"alice@example.com"}`;

async function extractJSON(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'JSON_ERROR', message: 'Model not ready' }); return; }
  resetIdleTimer();
  const messages = [
    { role: 'system', content: FORM_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user',   content: `Text: """${userInput}"""\nOutput:` },
  ];
  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 300, do_sample: false, temperature: 0.1 })));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { self.postMessage({ type: 'JSON_RESULT', data: {} }); return; }
    try { self.postMessage({ type: 'JSON_RESULT', data: JSON.parse(jsonMatch[0]) }); }
    catch { self.postMessage({ type: 'JSON_RESULT', data: {} }); }
  } catch (err) {
    self.postMessage({ type: 'JSON_ERROR', message: err instanceof Error ? err.message : 'Extraction failed' });
  }
}

// ── SmartAnalytics ────────────────────────────────────────────────────────────
const ANALYZE_PROMPT = `You are a data analysis AI. Dataset columns: {SCHEMA}

Pick the BEST action for the query and output ONLY a valid JSON object. No explanation, no markdown.

─── CHART ── visual graph (compare, distribution, by group, over time)
{"action":"chart","type":"bar","xKey":"role","yKey":"salary","aggregation":"avg","title":"Avg Salary by Role"}
{"action":"chart","type":"pie","xKey":"city","aggregation":"count","title":"Employees by City"}
{"action":"chart","type":"line","xKey":"age","yKey":"salary","aggregation":"avg","title":"Salary by Age"}
{"action":"chart","type":"scatter","xKey":"age","yKey":"salary","title":"Age vs Salary"}

─── TABLE ── list, rank, sort, top N, show all
{"action":"table","sortBy":"salary","sortDir":"desc","limit":5,"title":"Top 5 Earners"}
{"action":"table","sortBy":"age","sortDir":"asc","title":"Employees by Age"}
{"action":"table","filterField":"role","filterOp":"contains","filterValue":"engineer","title":"Engineers"}
{"action":"table","sortBy":"salary","sortDir":"desc","title":"Ranked by Salary"}

─── STAT ── single number answer (how many, average, total, highest, lowest, who)
{"action":"stat","metric":"count","label":"Total Employees"}
{"action":"stat","metric":"avg","field":"salary","label":"Average Salary"}
{"action":"stat","metric":"max","field":"salary","label":"Highest Salary"}
{"action":"stat","metric":"min","field":"age","label":"Youngest Employee"}
{"action":"stat","metric":"sum","field":"salary","label":"Total Payroll"}

─── FILTER ── show rows matching a condition
{"action":"filter","field":"salary","op":">","value":100000,"title":"Salary Over 100k"}
{"action":"filter","field":"city","op":"=","value":"New York","title":"New York Employees"}

Valid chart types: bar, line, pie, scatter
Valid aggregations: count, avg, sum, max, min
Valid metrics: count, avg, sum, max, min
Valid sortDir: asc, desc
Valid filterOp / op: >, <, =, contains

Output ONLY the JSON object.`;

async function analyzeData(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'ANALYSIS_ERROR', message: 'Model not ready' }); return; }
  resetIdleTimer();
  const messages = [
    { role: 'system', content: ANALYZE_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user',   content: `Query: "${userInput}"\nOutput:` },
  ];
  try {
    const raw = stripFences(extractOutput(await generator(messages, { max_new_tokens: 150, do_sample: false, temperature: 0.1 })));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      self.postMessage({ type: 'ANALYSIS_ERROR', message: 'AI could not interpret query. Try: "average salary by role"' });
      return;
    }
    try {
      const result = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      // Normalize: model sometimes omits "action" when type is obvious
      const CHART_TYPES = ['bar', 'line', 'pie', 'scatter'];
      const VALID_ACTIONS = ['chart', 'filter', 'table', 'stat'];
      // Normalize: if action missing but type looks like a chart, default to chart
      if (!result['action'] && CHART_TYPES.includes(String(result['type']))) {
        result['action'] = 'chart';
      }
      // Normalize: if action missing but metric present, default to stat
      if (!result['action'] && result['metric']) {
        result['action'] = 'stat';
      }
      // Normalize: if action missing but sortBy present, default to table
      if (!result['action'] && result['sortBy']) {
        result['action'] = 'table';
      }
      if (!VALID_ACTIONS.includes(String(result['action']))) {
        self.postMessage({ type: 'ANALYSIS_ERROR', message: 'Try: "average salary by role", "top 5 earners", "scatter age vs salary", "who earns the most", or "show engineers".' });
        return;
      }
      self.postMessage({ type: 'ANALYSIS_RESULT', result });
    } catch {
      self.postMessage({ type: 'ANALYSIS_ERROR', message: 'AI output was not valid JSON. Try rephrasing.' });
    }
  } catch (err) {
    self.postMessage({ type: 'ANALYSIS_ERROR', message: err instanceof Error ? err.message : 'Analysis failed' });
  }
}

// ── Message router ────────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'INIT':         await initModel(); break;
    case 'RUN_QUERY':    await runQuery(msg.schema, msg.userInput); break;
    case 'EXTRACT_JSON': await extractJSON(msg.schema, msg.userInput); break;
    case 'ANALYZE_DATA': await analyzeData(msg.schema, msg.userInput); break;
  }
};
