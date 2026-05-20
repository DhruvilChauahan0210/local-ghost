import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react';

export interface AIState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  mode: 'webgpu' | 'wasm' | 'server' | null;
}

export interface AnalysisResult {
  action: 'chart' | 'filter';
  // chart fields
  type?: 'bar' | 'line' | 'pie';
  xKey?: string;
  yKey?: string;
  aggregation?: 'count' | 'avg' | 'sum' | 'max' | 'min';
  // filter fields
  field?: string;
  op?: '>' | '<' | '=' | 'contains';
  value?: string | number;
  // shared
  title?: string;
}

interface Resolver<T> { resolve: (v: T) => void; reject: (r: string) => void; }

interface WebGPUAIContextValue extends AIState {
  initAI: () => void;
  runQuery:    (schema: string, userInput: string) => Promise<{ code: string; usedFallback: boolean }>;
  extractJSON: (schema: string, userInput: string) => Promise<Record<string, string>>;
  analyzeData: (schema: string, userInput: string) => Promise<AnalysisResult>;
}

type WorkerMessage =
  | { type: 'PROGRESS';        progress: number }
  | { type: 'READY' }
  | { type: 'QUERY_RESULT';    code: string; usedFallback: boolean }
  | { type: 'JSON_RESULT';     data: Record<string, string> }
  | { type: 'ANALYSIS_RESULT'; result: AnalysisResult }
  | { type: 'ERROR';           message: string };

export interface WebGPUAIProviderProps {
  children: ReactNode;
  serverFallbackUrl?: string;
}

const WebGPUAIContext = createContext<WebGPUAIContextValue | null>(null);

export function WebGPUAIProvider({ children, serverFallbackUrl }: WebGPUAIProviderProps) {
  const [aiState, setAiState] = useState<AIState>({ status: 'uninitialized', progress: 0, error: null, mode: null });

  const workerRef       = useRef<Worker | null>(null);
  const queryRef        = useRef<Resolver<{ code: string; usedFallback: boolean }> | null>(null);
  const jsonRef         = useRef<Resolver<Record<string, string>> | null>(null);
  const analysisRef     = useRef<Resolver<AnalysisResult> | null>(null);
  const fallbackUrlRef  = useRef(serverFallbackUrl);
  fallbackUrlRef.current = serverFallbackUrl;

  const rejectAll = (msg: string) => {
    queryRef.current?.reject(msg);    queryRef.current = null;
    jsonRef.current?.reject(msg);     jsonRef.current = null;
    analysisRef.current?.reject(msg); analysisRef.current = null;
  };

  const initAI = useCallback(() => {
    if (aiState.status !== 'uninitialized') return;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'PROGRESS':
          setAiState(p => ({ ...p, status: 'loading', progress: msg.progress }));
          break;
        case 'READY':
          setAiState(p => ({ ...p, status: 'ready', progress: 100, error: null, mode: hasWebGPU ? 'webgpu' : 'wasm' }));
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
        case 'ERROR':
          if (fallbackUrlRef.current) {
            setAiState(p => ({ ...p, status: 'ready', progress: 100, error: null, mode: 'server' }));
          } else {
            setAiState(p => ({ ...p, status: 'error', error: msg.message }));
          }
          rejectAll(msg.message);
          break;
      }
    };

    worker.onerror = (err) => {
      const message = err.message ?? 'Worker error';
      if (fallbackUrlRef.current) {
        setAiState(p => ({ ...p, status: 'ready', progress: 100, error: null, mode: 'server' }));
      } else {
        setAiState({ status: 'error', progress: 0, error: message, mode: null });
      }
      rejectAll(message);
    };

    setAiState({ status: 'loading', progress: 0, error: null, mode: null });
    worker.postMessage({ type: 'INIT' });
  }, [aiState.status]);

  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null; }, []);

  const runQuery = useCallback((schema: string, userInput: string) =>
    new Promise<{ code: string; usedFallback: boolean }>((resolve, reject) => {
      if (!workerRef.current) { reject('AI not initialized'); return; }
      if (queryRef.current)   { reject('Query already in progress'); return; }
      queryRef.current = { resolve, reject };
      workerRef.current.postMessage({ type: 'RUN_QUERY', schema, userInput });
    }), []);

  const extractJSON = useCallback((schema: string, userInput: string) =>
    new Promise<Record<string, string>>((resolve, reject) => {
      if (!workerRef.current) { reject('AI not initialized'); return; }
      if (jsonRef.current)    { reject('Extraction already in progress'); return; }
      jsonRef.current = { resolve, reject };
      workerRef.current.postMessage({ type: 'EXTRACT_JSON', schema, userInput });
    }), []);

  const analyzeData = useCallback((schema: string, userInput: string) =>
    new Promise<AnalysisResult>((resolve, reject) => {
      if (!workerRef.current)    { reject('AI not initialized'); return; }
      if (analysisRef.current)   { reject('Analysis already in progress'); return; }
      analysisRef.current = { resolve, reject };
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
