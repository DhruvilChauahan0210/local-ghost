import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react';
import { cacheKey, getCached, setCached } from '../utils/queryCache';

export interface AIState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error' | 'disposed';
  progress: number;
  error: string | null;
  mode: 'webgpu' | 'wasm' | 'server' | null;
  systemLogs: string[];
  isProcessing: boolean; // true while any query/json/analysis request is in-flight
}

export interface AnalysisResult {
  action: 'chart' | 'filter' | 'table' | 'stat';
  // chart
  type?: 'bar' | 'line' | 'pie' | 'scatter';
  xKey?: string;
  yKey?: string;
  aggregation?: 'count' | 'avg' | 'sum' | 'max' | 'min';
  // filter
  field?: string;
  op?: '>' | '<' | '=' | 'contains';
  value?: string | number;
  // table
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  filterField?: string;
  filterOp?: '>' | '<' | '=' | 'contains';
  filterValue?: string | number;
  // stat
  metric?: 'count' | 'avg' | 'sum' | 'max' | 'min';
  // shared
  label?: string;
  title?: string;
}

interface Resolver<T> { resolve: (v: T) => void; reject: (r: unknown) => void; }

interface WebGPUAIContextValue extends AIState {
  initAI:      () => void;
  runQuery:    (schema: string, userInput: string) => Promise<{ code: string; usedFallback: boolean }>;
  extractJSON: (schema: string, userInput: string) => Promise<Record<string, string>>;
  analyzeData: (schema: string, userInput: string) => Promise<AnalysisResult>;
}

type WorkerMessage =
  | { type: 'PROGRESS';        progress: number }
  | { type: 'READY';           device?: string }
  | { type: 'QUERY_RESULT';    code: string; usedFallback: boolean }
  | { type: 'JSON_RESULT';     data: Record<string, string> }
  | { type: 'ANALYSIS_RESULT'; result: AnalysisResult }
  | { type: 'LOG';             message: string }
  | { type: 'SYSTEM_STATUS';   status: 'disposed' | 'active' | 'hotswap' }
  | { type: 'ERROR';           message: string }          // init-level — kills AI status
  | { type: 'QUERY_ERROR';     message: string }          // query-level — AI stays ready
  | { type: 'JSON_ERROR';      message: string }          // json-level — AI stays ready
  | { type: 'ANALYSIS_ERROR';  message: string };         // analysis-level — AI stays ready

export interface WebGPUAIProviderProps {
  children: ReactNode;
  serverFallbackUrl?: string;
}

const MAX_LOGS = 12;
const addLog = (prev: string[], msg: string): string[] => [...prev, msg].slice(-MAX_LOGS);

const WebGPUAIContext = createContext<WebGPUAIContextValue | null>(null);

export function WebGPUAIProvider({ children, serverFallbackUrl }: WebGPUAIProviderProps) {
  const [aiState, setAiState] = useState<AIState>({
    status: 'uninitialized', progress: 0, error: null, mode: null, systemLogs: [], isProcessing: false,
  });

  const workerRef      = useRef<Worker | null>(null);
  const queryRef       = useRef<Resolver<{ code: string; usedFallback: boolean }> | null>(null);
  const jsonRef        = useRef<Resolver<Record<string, string>> | null>(null);
  const analysisRef    = useRef<Resolver<AnalysisResult> | null>(null);
  const fallbackUrlRef = useRef(serverFallbackUrl);
  fallbackUrlRef.current = serverFallbackUrl;

  const setProcessing = (v: boolean) =>
    setAiState(p => ({ ...p, isProcessing: v }));

  const rejectAll = (err: Error) => {
    queryRef.current?.reject(err);    queryRef.current = null;
    jsonRef.current?.reject(err);     jsonRef.current = null;
    analysisRef.current?.reject(err); analysisRef.current = null;
    setProcessing(false);
  };

  const initAI = useCallback(() => {
    if (aiState.status !== 'uninitialized' && aiState.status !== 'disposed') return;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'PROGRESS':
          setAiState(p => ({ ...p, status: 'loading', progress: msg.progress }));
          break;

        case 'LOG':
          setAiState(p => ({ ...p, systemLogs: addLog(p.systemLogs, msg.message) }));
          break;

        case 'READY':
          setAiState(p => ({
            ...p, status: 'ready', progress: 100, error: null, isProcessing: false,
            // Use device reported by worker — could be 'wasm' after a hotswap
            mode: (msg.device === 'wasm' ? 'wasm' : hasWebGPU ? 'webgpu' : 'wasm'),
            systemLogs: addLog(p.systemLogs, `[LG_SYSTEM] Local Ghost is active. Running on ${(msg.device ?? (hasWebGPU ? 'webgpu' : 'wasm')).toUpperCase()}.`),
          }));
          break;

        case 'QUERY_RESULT':
          queryRef.current?.resolve({ code: msg.code, usedFallback: msg.usedFallback });
          queryRef.current = null;
          break;

        case 'JSON_RESULT':
          jsonRef.current?.resolve(msg.data);
          jsonRef.current = null;
          break;

        case 'ANALYSIS_RESULT':
          analysisRef.current?.resolve(msg.result);
          analysisRef.current = null;
          break;

        case 'SYSTEM_STATUS':
          if (msg.status === 'disposed') {
            setAiState(p => ({
              ...p, status: 'disposed', mode: null, progress: 0, isProcessing: false,
              systemLogs: addLog(p.systemLogs, '[LG_SYSTEM] VRAM purged — 5 min idle. Click Enable AI to reload.'),
            }));
          } else if (msg.status === 'hotswap') {
            // GPU context was lost — worker is reinitialising on WASM; show loading bar
            setAiState(p => ({
              ...p, status: 'loading', progress: 0, mode: null, isProcessing: false,
              systemLogs: addLog(p.systemLogs, '[LG_HARDENING] WebGPU context lost. Hot-swapping to WASM...'),
            }));
          }
          break;

        // Query-level failure — AI model stays ready, just this request failed
        case 'QUERY_ERROR':
          queryRef.current?.reject(new Error(msg.message));
          queryRef.current = null;
          setProcessing(false);
          break;

        case 'JSON_ERROR':
          jsonRef.current?.reject(new Error(msg.message));
          jsonRef.current = null;
          setProcessing(false);
          break;

        case 'ANALYSIS_ERROR':
          analysisRef.current?.reject(new Error(msg.message));
          analysisRef.current = null;
          setProcessing(false);
          break;

        // Init-level failure — AI cannot recover
        case 'ERROR': {
          const err = new Error(msg.message);
          if (fallbackUrlRef.current) {
            setAiState(p => ({ ...p, status: 'ready', progress: 100, error: null, mode: 'server' }));
          } else {
            setAiState(p => ({ ...p, status: 'error', error: msg.message }));
          }
          rejectAll(err);
          break;
        }
      }
    };

    worker.onerror = (e) => {
      const message = e.message ?? 'Worker error';
      const err = new Error(message);
      if (fallbackUrlRef.current) {
        setAiState(p => ({ ...p, status: 'ready', progress: 100, error: null, mode: 'server', isProcessing: false }));
      } else {
        setAiState({ status: 'error', progress: 0, error: message, mode: null, systemLogs: [], isProcessing: false });
      }
      rejectAll(err);
    };

    setAiState(p => ({ ...p, status: 'loading', progress: 0, error: null, systemLogs: [], isProcessing: false }));
    worker.postMessage({ type: 'INIT' });
  }, [aiState.status]);

  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null; }, []);

  // ── runQuery with IndexedDB cache + concurrency lock ─────────────────────
  const runQuery = useCallback((schema: string, userInput: string) =>
    new Promise<{ code: string; usedFallback: boolean }>(async (resolve, reject) => {
      // Cache check bypasses the lock — 0ms responses are always safe
      const key = cacheKey(userInput, schema);
      const cached = await getCached<{ code: string; usedFallback: boolean }>(key);
      if (cached) {
        setAiState(p => ({ ...p, systemLogs: addLog(p.systemLogs, `[LG_CACHE] Cache hit — returning in 0ms`) }));
        resolve(cached);
        return;
      }
      if (!workerRef.current) { reject(new Error('AI not initialized')); return; }
      // Transaction lock: silently drop if another request is already in-flight
      if (queryRef.current) {
        reject(new Error('A query is already in progress — please wait'));
        return;
      }
      setProcessing(true);
      queryRef.current = {
        resolve: async (result) => { setProcessing(false); await setCached(key, result); resolve(result); },
        reject: (err) => { setProcessing(false); reject(err); },
      };
      workerRef.current.postMessage({ type: 'RUN_QUERY', schema, userInput });
    }), []);

  // ── extractJSON with cache + concurrency lock ─────────────────────────────
  const extractJSON = useCallback((schema: string, userInput: string) =>
    new Promise<Record<string, string>>(async (resolve, reject) => {
      const key = cacheKey(userInput, schema);
      const cached = await getCached<Record<string, string>>(key);
      if (cached) {
        setAiState(p => ({ ...p, systemLogs: addLog(p.systemLogs, `[LG_CACHE] Cache hit — returning in 0ms`) }));
        resolve(cached);
        return;
      }
      if (!workerRef.current) { reject(new Error('AI not initialized')); return; }
      if (jsonRef.current) { reject(new Error('Extraction already in progress')); return; }
      setProcessing(true);
      jsonRef.current = {
        resolve: async (result) => { setProcessing(false); await setCached(key, result); resolve(result); },
        reject: (err) => { setProcessing(false); reject(err); },
      };
      workerRef.current.postMessage({ type: 'EXTRACT_JSON', schema, userInput });
    }), []);

  // ── analyzeData with cache + concurrency lock ─────────────────────────────
  const analyzeData = useCallback((schema: string, userInput: string) =>
    new Promise<AnalysisResult>(async (resolve, reject) => {
      const key = cacheKey(userInput, schema);
      const cached = await getCached<AnalysisResult>(key);
      if (cached) {
        setAiState(p => ({ ...p, systemLogs: addLog(p.systemLogs, `[LG_CACHE] Cache hit — returning in 0ms`) }));
        resolve(cached);
        return;
      }
      if (!workerRef.current)  { reject(new Error('AI not initialized')); return; }
      if (analysisRef.current) { reject(new Error('Analysis already in progress')); return; }
      setProcessing(true);
      analysisRef.current = {
        resolve: async (result) => { setProcessing(false); await setCached(key, result); resolve(result); },
        reject: (err) => { setProcessing(false); reject(err); },
      };
      workerRef.current.postMessage({ type: 'ANALYZE_DATA', schema, userInput });
    }), []);

  return (
    <WebGPUAIContext.Provider value={{ ...aiState, initAI, runQuery, extractJSON, analyzeData }}>
      {children}
    </WebGPUAIContext.Provider>
  );
}

export function useWebGPUAIContext(): WebGPUAIContextValue {
  const ctx = useContext(WebGPUAIContext);
  if (!ctx) throw new Error('useWebGPUAIContext must be used within a WebGPUAIProvider');
  return ctx;
}
