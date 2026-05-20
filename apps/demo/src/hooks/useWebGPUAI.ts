import { useWebGPUAIContext } from '../context/WebGPUAIContext';
import type { AIState } from '../context/WebGPUAIContext';

export interface UseWebGPUAIReturn extends AIState {
  initAI: () => void;
  runQuery: (schema: string, userInput: string) => Promise<string>;
  extractJSON: (schema: string, userInput: string) => Promise<Record<string, string>>;
}

export function useWebGPUAI(): UseWebGPUAIReturn {
  return useWebGPUAIContext();
}
