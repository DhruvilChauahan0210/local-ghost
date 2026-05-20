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
}

interface QueryResolver {
  resolve: (code: string) => void;
  reject: (reason: string) => void;
}

interface WebGPUAIContextValue extends AIState {
  initAI: () => void;
  runQuery: (schema: string, userInput: string) => Promise<string>;
}

type WorkerMessage =
  | { type: 'PROGRESS'; progress: number }
  | { type: 'READY' }
  | { type: 'QUERY_RESULT'; code: string }
  | { type: 'ERROR'; message: string };

const WebGPUAIContext = createContext<WebGPUAIContextValue | null>(null);

export function WebGPUAIProvider({ children }: { children: ReactNode }) {
  const [aiState, setAiState] = useState<AIState>({
    status: 'uninitialized',
    progress: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const pendingQueryRef = useRef<QueryResolver | null>(null);

  const initAI = useCallback(() => {
    if (aiState.status !== 'uninitialized') return;

    if (typeof navigator.gpu === 'undefined') {
      setAiState({
        status: 'error',
        progress: 0,
        error:
          'WebGPU is not available in this browser. Try Chrome 113+ or Edge 113+ with WebGPU enabled.',
      });
      return;
    }

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
          setAiState({ status: 'ready', progress: 100, error: null });
          break;

        case 'QUERY_RESULT':
          if (pendingQueryRef.current) {
            pendingQueryRef.current.resolve(msg.code);
            pendingQueryRef.current = null;
          }
          break;

        case 'ERROR':
          setAiState((prev) => ({
            ...prev,
            status: 'error',
            error: msg.message,
          }));
          if (pendingQueryRef.current) {
            pendingQueryRef.current.reject(msg.message);
            pendingQueryRef.current = null;
          }
          break;
      }
    };

    worker.onerror = (err) => {
      const message = err.message ?? 'Unknown worker error';
      setAiState({ status: 'error', progress: 0, error: message });
      if (pendingQueryRef.current) {
        pendingQueryRef.current.reject(message);
        pendingQueryRef.current = null;
      }
    };

    setAiState({ status: 'loading', progress: 0, error: null });
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
        workerRef.current.postMessage({
          type: 'RUN_QUERY',
          schema,
          userInput,
        });
      });
    },
    []
  );

  const contextValue: WebGPUAIContextValue = {
    ...aiState,
    initAI,
    runQuery,
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
