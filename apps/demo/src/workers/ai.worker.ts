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

// Hold our own GPUDevice handle so we can listen for context loss events
type GPUDeviceLike = { lost: Promise<{ message: string; reason?: string }>; destroy?: () => void };
let glDevice: GPUDeviceLike | null = null;

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

// ── WebGPU device-lost hot-swap ───────────────────────────────────────────────
async function handleDeviceLost(info: { message: string }): Promise<void> {
  log(`WebGPU context lost: ${info.message}. Hot-swapping to WASM...`);
  self.postMessage({ type: 'SYSTEM_STATUS', status: 'hotswap' });

  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (generator && typeof generator.dispose === 'function') {
    try { await generator.dispose(); } catch { /* ignore — device already gone */ }
  }
  generator = null;
  glDevice   = null;

  // Re-initialise on WASM — no GPU, no device-lost re-registration needed
  let lastFile = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cb = (p: any) => {
    self.postMessage({ type: 'PROGRESS', progress: Math.round(p.progress ?? 0) });
    if (p.status === 'initiate' && p.file !== lastFile) { lastFile = p.file ?? ''; log(`Loading: ${lastFile}`); }
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generator = await pipeline('text-generation', MODEL_ID, { device: 'wasm', dtype: 'q8', progress_callback: cb as any });
    log('Hot-swap complete. Running on WASM.');
    self.postMessage({ type: 'READY', device: 'wasm' });
    resetIdleTimer();
  } catch (e) {
    self.postMessage({ type: 'ERROR', message: e instanceof Error ? e.message : 'WASM fallback failed after device loss' });
  }
}

// ── Model init ────────────────────────────────────────────────────────────────
async function initModel(): Promise<void> {
  // Extended GPU type to access requestDevice and device.lost
  type GPUAdapter = { requestDevice: () => Promise<GPUDeviceLike> };
  type GPUNav     = Navigator & { gpu?: { requestAdapter: (o?: unknown) => Promise<GPUAdapter | null> } };
  const nav       = navigator as GPUNav;
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
    if (device === 'webgpu') {
      log(`Allocating WebGPU command buffers and VRAM shaders...`);
      // Acquire our own GPUDevice handle to monitor for context loss
      try {
        const adapter = await nav.gpu!.requestAdapter();
        if (adapter) {
          glDevice = await adapter.requestDevice();
          // Non-blocking: when GPU is lost (OS sleep, VRAM spike, tab freeze)
          // hot-swap to WASM so inference continues without user-visible errors
          glDevice.lost.then((info) => void handleDeviceLost(info));
        }
      } catch {
        // Device acquisition failed — pipeline still initialises, just no lost listener
      }
    } else {
      log(`Starting WASM inference engine (WebGPU unavailable)...`);
    }
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

  // "how many X" / "count X" → treat as a filter (array length tells the count)
  const countM = q.match(/(?:how many|count(?:\s+of)?|number of)\s+([a-z][a-z\s]*?)(?:\s+are there)?(?:\s+in the data)?$/);
  if (countM && !gtM && !ltM) {
    const rawVal = countM[1].trim().replace(/s$/, '');
    if (rawVal && rawVal.length > 2) {
      const sf = fields.find(f => STRING_FIELDS.includes(f.toLowerCase()));
      if (sf) parts.push(`String(row['${sf}']).toLowerCase().includes('${rawVal.toLowerCase()}')`);
    }
    // "how many employees / people / total" → return all rows
  }

  // "show only X" / "only X" / "filter X" / "find X" / "list X" / bare noun
  if (!gtM && !ltM && !eqM && !countM) {
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
      // Validate: must not throw AND must return an array (not a number/string/etc.)
      const testResult = (new Function('data', `return (${code})([])`))([] as Record<string, unknown>[]);
      if (!Array.isArray(testResult)) {
        throw new Error(`code returned ${typeof testResult}, expected array`);
      }
      self.postMessage({ type: 'QUERY_RESULT', code, usedFallback: false });
    } catch {
      const fields = schema.split(',').map(s => s.trim());
      const fixed = fixBrokenArrowFn(userInput, fields);
      if (fixed) {
        self.postMessage({ type: 'QUERY_RESULT', code: fixed, usedFallback: true });
      } else {
        self.postMessage({
          type: 'QUERY_ERROR',
          message: `Could not produce a data query for "${userInput}". For counts or averages, try the Analytics tab.`,
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

─── TABLE ── list, rank, sort, top N, show all, who is X
{"action":"table","sortBy":"salary","sortDir":"desc","limit":5,"title":"Top 5 Earners"}
{"action":"table","sortBy":"age","sortDir":"asc","title":"Employees by Age"}
{"action":"table","filterField":"role","filterOp":"contains","filterValue":"engineer","title":"Engineers"}

─── STAT ── single number answer (how many, average, total, highest, lowest, who earns most)
{"action":"stat","metric":"count","label":"Total Employees"}
{"action":"stat","metric":"avg","field":"salary","label":"Average Salary"}
{"action":"stat","metric":"max","field":"salary","label":"Highest Salary"}
{"action":"stat","metric":"min","field":"age","label":"Youngest Employee"}
{"action":"stat","metric":"sum","field":"salary","label":"Total Payroll"}

─── FILTER ── rows matching a condition
{"action":"filter","field":"salary","op":">","value":100000,"title":"Salary Over 100k"}
{"action":"filter","field":"city","op":"=","value":"New York","title":"New York Employees"}

Valid chart types: bar, line, pie, scatter
Valid aggregations: count, avg, sum, max, min
Valid metrics: count, avg, sum, max, min
Valid sortDir: asc, desc
Valid filterOp / op: >, <, =, contains

Output ONLY the JSON object.`;

const NUMERIC_HINTS = ['salary','age','price','amount','cost','revenue','score','count','total','value','rate','income','pay','wage'];
const STRING_HINTS  = ['name','city','role','department','type','status','country','team','category','title','region','gender'];

function pickField(fields: string[], hints: string[]): string | undefined {
  return fields.find(f => hints.some(h => f.toLowerCase().includes(h)));
}

// Fill in any missing fields the model forgot to include
function normalizeResult(r: Record<string, unknown>, schema: string, query: string): Record<string, unknown> {
  const fields = schema.split(',').map(s => s.trim());
  const q = `${r['label'] ?? ''} ${r['title'] ?? ''} ${query}`.toLowerCase();
  const numF = pickField(fields, NUMERIC_HINTS) ?? fields[fields.length - 1];
  const strF = pickField(fields, STRING_HINTS)  ?? fields[0];

  const CHART_TYPES   = ['bar','line','pie','scatter'];
  const VALID_ACTIONS = ['chart','filter','table','stat'];

  // Infer action from other fields when missing
  if (!r['action']) {
    if (CHART_TYPES.includes(String(r['type'])))           r['action'] = 'chart';
    else if (r['metric'])                                  r['action'] = 'stat';
    else if (r['sortBy'])                                  r['action'] = 'table';
    else if (r['field'] && r['op'])                        r['action'] = 'filter';
  }

  if (r['action'] === 'stat') {
    // Infer metric from natural language when missing
    if (!r['metric']) {
      if (/average|avg|mean/.test(q))                     r['metric'] = 'avg';
      else if (/total|sum|payroll/.test(q))               r['metric'] = 'sum';
      else if (/max|highest|most|top|best|earns|earner/.test(q)) r['metric'] = 'max';
      else if (/min|lowest|least|youngest|fewest/.test(q)) r['metric'] = 'min';
      else if (/count|how many|number of/.test(q))        r['metric'] = 'count';
      else                                                 r['metric'] = 'count';
    }
    // Infer field when missing (required for non-count)
    if (r['metric'] !== 'count' && !r['field']) {
      r['field'] = r['yKey'] ?? r['xKey'] ?? numF;
    }
  }

  if (r['action'] === 'table') {
    if (!r['sortBy']) { r['sortBy'] = numF; r['sortDir'] = r['sortDir'] ?? 'desc'; }
  }

  if (r['action'] === 'chart') {
    if (!r['xKey']) r['xKey'] = strF;
    if (r['type'] !== 'scatter' && !r['yKey'] && !r['aggregation']) r['aggregation'] = 'count';
    if (r['type'] !== 'scatter' && !r['yKey'] && r['aggregation'] !== 'count') r['yKey'] = numF;
  }

  if (r['action'] === 'filter' && !r['op']) r['op'] = 'contains';

  // Final fallback: if action still invalid, default to table sorted by first numeric field
  if (!VALID_ACTIONS.includes(String(r['action']))) {
    r['action'] = 'table'; r['sortBy'] = numF; r['sortDir'] = 'desc';
  }

  return r;
}

// Pure rule-based fallback — handles common patterns without AI
function ruleBasedAnalysis(query: string, schema: string): Record<string, unknown> | null {
  const q = query.toLowerCase();
  const fields = schema.split(',').map(s => s.trim());
  const numF = pickField(fields, NUMERIC_HINTS) ?? fields[fields.length - 1];
  const strF = pickField(fields, STRING_HINTS)  ?? fields[0];

  // who earns the most / highest earner / highest salary
  if (/who.*(earn|make|paid|salary|wage)/.test(q) || /highest.*(earn|paid|salary|wage)/.test(q) || /most.*(earn|paid)/.test(q))
    return { action:'stat', metric:'max', field: pickField(fields,['salary','wage','pay','income']) ?? numF, label:'Highest Earner' };

  // youngest / oldest
  if (/youngest/.test(q))
    return { action:'stat', metric:'min', field: pickField(fields,['age']) ?? numF, label:'Youngest Employee' };
  if (/oldest|eldest/.test(q))
    return { action:'stat', metric:'max', field: pickField(fields,['age']) ?? numF, label:'Oldest Employee' };

  // average / avg / mean X
  const avgM = q.match(/(?:average|avg|mean)\s+(?:of\s+)?(\w+)/);
  if (avgM) {
    const f = fields.find(f => f.toLowerCase() === avgM[1]) ?? numF;
    return { action:'stat', metric:'avg', field:f, label:`Average ${f}` };
  }

  // total / sum X / payroll
  const sumM = q.match(/(?:total|sum(?:\s+of)?|payroll)\s*(?:of\s+|the\s+)?(\w+)?/);
  if (sumM) {
    const f = (sumM[1] && fields.find(f => f.toLowerCase() === sumM[1])) ?? numF;
    return { action:'stat', metric:'sum', field:f, label:`Total ${f}` };
  }

  // highest / maximum / max X
  const maxM = q.match(/(?:max(?:imum)?|highest|greatest)\s+(?:the\s+)?(\w+)/);
  if (maxM) {
    const f = fields.find(f => f.toLowerCase() === maxM[1]) ?? numF;
    return { action:'stat', metric:'max', field:f, label:`Highest ${f}` };
  }

  // lowest / minimum / min X
  const minM = q.match(/(?:min(?:imum)?|lowest|least|smallest)\s+(?:the\s+)?(\w+)/);
  if (minM) {
    const f = fields.find(f => f.toLowerCase() === minM[1]) ?? numF;
    return { action:'stat', metric:'min', field:f, label:`Lowest ${f}` };
  }

  // top N / best N
  const topM = q.match(/(?:top|best|highest)\s+(\d+)/);
  if (topM)
    return { action:'table', sortBy:numF, sortDir:'desc', limit:parseInt(topM[1]), title:`Top ${topM[1]}` };

  // bottom N / lowest N
  const botM = q.match(/(?:bottom|worst|lowest)\s+(\d+)/);
  if (botM)
    return { action:'table', sortBy:numF, sortDir:'asc', limit:parseInt(botM[1]), title:`Bottom ${botM[1]}` };

  // how many
  if (/how many|total count|total number/.test(q))
    return { action:'stat', metric:'count', label:'Total Count' };

  // count by / group by / breakdown by
  const cntByM = q.match(/(?:count|group|breakdown|distribute)\s+by\s+(\w+)/);
  if (cntByM) {
    const f = fields.find(f => f.toLowerCase() === cntByM[1]) ?? strF;
    return { action:'chart', type:'bar', xKey:f, aggregation:'count', title:`Count by ${f}` };
  }

  // average X by Y
  const avgByM = q.match(/(?:avg|average)\s+(\w+)\s+by\s+(\w+)/);
  if (avgByM) {
    const yK = fields.find(f => f.toLowerCase() === avgByM[1]) ?? numF;
    const xK = fields.find(f => f.toLowerCase() === avgByM[2]) ?? strF;
    return { action:'chart', type:'bar', xKey:xK, yKey:yK, aggregation:'avg', title:`Avg ${yK} by ${xK}` };
  }

  // scatter X vs Y
  const scatM = q.match(/(?:scatter|plot)\s+(\w+)\s+(?:vs|against|versus)\s+(\w+)/);
  if (scatM) {
    const xK = fields.find(f => f.toLowerCase() === scatM[1]) ?? scatM[1];
    const yK = fields.find(f => f.toLowerCase() === scatM[2]) ?? scatM[2];
    return { action:'chart', type:'scatter', xKey:xK, yKey:yK, title:`${xK} vs ${yK}` };
  }

  // sort / rank by X
  const sortM = q.match(/(?:sort|rank|order)\s+by\s+(\w+)(?:\s+(desc|asc))?/);
  if (sortM) {
    const f = fields.find(f => f.toLowerCase() === sortM[1]) ?? sortM[1];
    return { action:'table', sortBy:f, sortDir: sortM[2] === 'asc' ? 'asc' : 'desc', title:`Sorted by ${f}` };
  }

  // show / list / filter + string value
  const showM = q.match(/(?:show|list|find|filter|display)\s+(?:all\s+)?([a-z][a-z\s]*)$/);
  if (showM) {
    const val = showM[1].trim().replace(/s$/, '');
    if (val.length > 2)
      return { action:'filter', field: pickField(fields, STRING_HINTS) ?? strF, op:'contains', value:val, title:`Filter: ${val}` };
  }

  return null;
}

async function analyzeData(schema: string, userInput: string): Promise<void> {
  if (!generator) { self.postMessage({ type: 'ANALYSIS_ERROR', message: 'Model not ready' }); return; }
  resetIdleTimer();

  // Try rule-based first for very common patterns (fast, no inference needed)
  const ruleResult = ruleBasedAnalysis(userInput, schema);

  const messages = [
    { role: 'system', content: ANALYZE_PROMPT.replace('{SCHEMA}', schema) },
    { role: 'user',   content: `Query: "${userInput}"\nOutput:` },
  ];
  try {
    const raw = stripFences(extractOutput(
      await generator(messages, { max_new_tokens: 150, do_sample: false, temperature: 0.1 })
    ));

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // AI produced no JSON — use rule-based if available
      if (ruleResult) {
        self.postMessage({ type: 'ANALYSIS_RESULT', result: ruleResult });
      } else {
        self.postMessage({ type: 'ANALYSIS_ERROR', message: 'Could not interpret query. Try: "average salary by role", "who earns the most", "top 5 earners", "show engineers".' });
      }
      return;
    }

    try {
      let result = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      // Fill in any fields the model forgot
      result = normalizeResult(result, schema, userInput);
      self.postMessage({ type: 'ANALYSIS_RESULT', result });
    } catch {
      // JSON parse failed — fall back to rule-based
      if (ruleResult) {
        self.postMessage({ type: 'ANALYSIS_RESULT', result: ruleResult });
      } else {
        self.postMessage({ type: 'ANALYSIS_ERROR', message: 'AI output was malformed. Try rephrasing.' });
      }
    }
  } catch (err) {
    // Inference error — still try rule-based
    if (ruleResult) {
      self.postMessage({ type: 'ANALYSIS_RESULT', result: ruleResult });
    } else {
      self.postMessage({ type: 'ANALYSIS_ERROR', message: err instanceof Error ? err.message : 'Analysis failed' });
    }
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
