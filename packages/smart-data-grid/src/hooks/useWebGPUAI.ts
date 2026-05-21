import { useWebGPUAIContext } from '../context/WebGPUAIContext';
import type { AIState, AnalysisResult } from '../context/WebGPUAIContext';

export interface UseWebGPUAIReturn extends AIState {
  initAI:      () => void;
  runQuery:    (schema: string, userInput: string) => Promise<{ code: string; usedFallback: boolean }>;
  extractJSON: (schema: string, userInput: string) => Promise<Record<string, string>>;
  analyzeData: (schema: string, userInput: string) => Promise<AnalysisResult>;
}

export function useWebGPUAI(): UseWebGPUAIReturn {
  return useWebGPUAIContext();
}

export type { AnalysisResult };
