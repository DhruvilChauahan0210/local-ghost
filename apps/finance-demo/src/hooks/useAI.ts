import { useWebGPUAI } from '@dhruvil0210/local-ghost';
import type { AnalysisResult } from '@dhruvil0210/local-ghost';

export type { AnalysisResult };
export { useWebGPUAI };

// Run AI-generated filter/sort code inside a hardened sandbox
export function execSandbox(code: string, data: unknown[]): unknown[] | null {
  try {
    const fn = new Function(
      'data','window','document','fetch','localStorage','sessionStorage',
      `"use strict"; const fn = ${code}; return fn(data);`
    );
    const result = fn(data, null, null, null, null, null);
    return Array.isArray(result) ? result as unknown[] : null;
  } catch {
    return null;
  }
}
