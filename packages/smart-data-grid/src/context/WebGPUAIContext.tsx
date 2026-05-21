import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface AIState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  mode: 'webgpu' | 'wasm' | 'server' | null;
}

interface QueryResolver {
  resolve: (code: string) => void;
  reject: (reason: unknown) => void;
}

interface JSONResolver {
  resolve: (data: Record<string, string>) => void;
  reject: (reason: unknown) => void;
}

interface WebGPUAIContextValue extends AIState {
  initAI: () => void;
  runQuery: (schema: string, userInput: string) => Promise<string>;
  extractJSON: (schema: string, userInput: string) => Promise<Record<string, string>>;
}

type WorkerMessage =
  | { type: 'PROGRESS'; progress: number }
  | { type: 'READY' }
  | { type: 'QUERY_RESULT'; code: string }
  | { type: 'JSON_RESULT'; data: Record<string, string> }
  | { type: 'ERROR'; message: string }       // init-level: kills AI status
  | { type: 'QUERY_ERROR'; message: string } // query-level: AI stays ready
  | { type: 'JSON_ERROR'; message: string };  // json-level: AI stays ready

export interface WebGPUAIProviderProps {
  children: ReactNode;
  serverFallbackUrl?: string;
}

const WebGPUAIContext = createContext<WebGPUAIContextValue | null>(null);

export function WebGPUAIProvider({ children, serverFallbackUrl }: WebGPUAIProviderProps) {
  const [aiState, setAiState] = useState<AIState>({
    status: 'uninitialized',
    progress: 0,
    error: null,
    mode: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const pendingQueryRef = useRef<QueryResolver | null>(null);
  const pendingJSONRef = useRef<JSONResolver | null>(null);
  const serverFallbackUrlRef = useRef<string | undefined>(serverFallbackUrl);
  // Keep the ref up-to-date if prop changes
  serverFallbackUrlRef.current = serverFallbackUrl;

  const initAI = useCallback(() => {
    if (aiState.status !== 'uninitialized') return;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

    // If no WebGPU and no WASM support expected, and server fallback provided — go straight to server mode
    // Worker handles WebGPU → WASM fallback internally; we set mode after READY
    const worker = new Worker(
      new URL('../workers/ai.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'PROGRESS':
          setAiState((prev) => ({
            ...prev,
            status: 'loading',
            progress: msg.progress,
          }));
          break;

        case 'READY':
          setAiState((prev) => ({
            ...prev,
            status: 'ready',
            progress: 100,
            error: null,
            // Determine mode: the worker already tried WebGPU first, then WASM
            mode: hasWebGPU ? 'webgpu' : 'wasm',
          }));
          break;

        case 'QUERY_RESULT':
          if (pendingQueryRef.current) {
            pendingQueryRef.current.resolve(msg.code);
            pendingQueryRef.current = null;
          }
          break;

        case 'JSON_RESULT':
          if (pendingJSONRef.current) {
            pendingJSONRef.current.resolve(msg.data);
            pendingJSONRef.current = null;
          }
          break;

        case 'QUERY_ERROR': {
          // Query-level failure — AI model stays ready, only this request fails
          if (pendingQueryRef.current) {
            pendingQueryRef.current.reject(new Error(msg.message));
            pendingQueryRef.current = null;
          }
          break;
        }

        case 'JSON_ERROR': {
          if (pendingJSONRef.current) {
            pendingJSONRef.current.reject(new Error(msg.message));
            pendingJSONRef.current = null;
          }
          break;
        }

        case 'ERROR': {
          // Init-level failure — AI cannot recover, set status to error
          const fallbackUrl = serverFallbackUrlRef.current;
          if (fallbackUrl) {
            setAiState({
              status: 'ready',
              progress: 100,
              error: null,
              mode: 'server',
            });
            if (pendingQueryRef.current) {
              pendingQueryRef.current.reject(new Error(msg.message));
              pendingQueryRef.current = null;
            }
            if (pendingJSONRef.current) {
              pendingJSONRef.current.reject(new Error(msg.message));
              pendingJSONRef.current = null;
            }
          } else {
            setAiState((prev) => ({
              ...prev,
              status: 'error',
              error: msg.message,
            }));
            if (pendingQueryRef.current) {
              pendingQueryRef.current.reject(new Error(msg.message));
              pendingQueryRef.current = null;
            }
            if (pendingJSONRef.current) {
              pendingJSONRef.current.reject(new Error(msg.message));
              pendingJSONRef.current = null;
            }
          }
          break;
        }
      }
    };

    worker.onerror = (err) => {
      const message = err.message ?? 'Unknown worker error';
      const fallbackUrl = serverFallbackUrlRef.current;
      if (fallbackUrl) {
        setAiState({ status: 'ready', progress: 100, error: null, mode: 'server' });
      } else {
        setAiState({ status: 'error', progress: 0, error: message, mode: null });
      }
      if (pendingQueryRef.current) {
        pendingQueryRef.current.reject(new Error(message));
        pendingQueryRef.current = null;
      }
      if (pendingJSONRef.current) {
        pendingJSONRef.current.reject(new Error(message));
        pendingJSONRef.current = null;
      }
    };

    setAiState({ status: 'loading', progress: 0, error: null, mode: null });
    worker.postMessage({ type: 'INIT' });
  }, [aiState.status]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const runQuery = useCallback(
    (schema: string, userInput: string): Promise<string> => {
      // Server fallback path
      if (aiState.mode === 'server') {
        const url = serverFallbackUrlRef.current;
        if (!url) return Promise.reject('No server fallback URL configured');
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'RUN_QUERY', schema, userInput }),
        })
          .then((r) => r.json() as Promise<{ code: string }>)
          .then((j) => j.code);
      }

      return new Promise<string>((resolve, reject) => {
        if (!workerRef.current) {
          reject('Worker is not initialized');
          return;
        }
        if (pendingQueryRef.current) {
          reject('A query is already in progress');
          return;
        }
        pendingQueryRef.current = { resolve, reject };
        workerRef.current.postMessage({ type: 'RUN_QUERY', schema, userInput });
      });
    },
    [aiState.mode]
  );

  const extractJSON = useCallback(
    (schema: string, userInput: string): Promise<Record<string, string>> => {
      // Server fallback path
      if (aiState.mode === 'server') {
        const url = serverFallbackUrlRef.current;
        if (!url) return Promise.reject('No server fallback URL configured');
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'EXTRACT_JSON', schema, userInput }),
        })
          .then((r) => r.json() as Promise<{ data: Record<string, string> }>)
          .then((j) => j.data);
      }

      return new Promise<Record<string, string>>((resolve, reject) => {
        if (!workerRef.current) {
          reject('Worker is not initialized');
          return;
        }
        if (pendingJSONRef.current) {
          reject('A JSON extraction is already in progress');
          return;
        }
        pendingJSONRef.current = { resolve, reject };
        workerRef.current.postMessage({ type: 'EXTRACT_JSON', schema, userInput });
      });
    },
    [aiState.mode]
  );

  const contextValue: WebGPUAIContextValue = {
    ...aiState,
    initAI,
    runQuery,
    extractJSON,
  };

  return (
    <WebGPUAIContext.Provider value={contextValue}>
      {children}
    </WebGPUAIContext.Provider>
  );
}

export function useWebGPUAIContext(): WebGPUAIContextValue {
  const ctx = useContext(WebGPUAIContext);
  if (!ctx) {
    throw new Error('useWebGPUAIContext must be used within a WebGPUAIProvider');
  }
  return ctx;
}
