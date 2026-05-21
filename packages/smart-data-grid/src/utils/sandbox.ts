const BLACKLISTED_TOKENS = [
  'prototype',
  '__proto__',
  'constructor',
  'globalThis',
  'XMLHttpRequest',
  'WebSocket',
  'postMessage',
  'document.cookie',
  'importScripts',
  'eval(',
  'Function(',
  'atob(',
  'btoa(',
  'fetch(',
];

export function verifyCodeSafety(codeString: string): boolean {
  for (const token of BLACKLISTED_TOKENS) {
    if (codeString.includes(token)) {
      return false;
    }
  }
  return true;
}

export function safelyExecuteGeneratedCode(
  generatedCode: string,
  targetData: Array<Record<string, unknown>>
): Array<Record<string, unknown>> | null {
  if (!verifyCodeSafety(generatedCode)) {
    console.error('[Local Ghost] Sandbox blocked: blacklisted token detected in generated code.');
    return null;
  }

  // Deep-freeze a clean clone so generated code cannot mutate the original dataset
  const immutableData = Object.freeze(JSON.parse(JSON.stringify(targetData)));

  try {
    const sandboxed = new Function(
      'data',
      'window',
      'document',
      'fetch',
      'localStorage',
      'sessionStorage',
      'cookieStore',
      'indexedDB',
      'XMLHttpRequest',
      'WebSocket',
      `
        "use strict";
        const fn = ${generatedCode};
        return fn(data);
      `
    );

    // All global references are shadowed with null inside the sandbox
    const result = sandboxed(
      immutableData,
      null, null, null, null, null, null, null, null, null
    );

    if (!Array.isArray(result)) {
      throw new TypeError('Generated code did not return an array');
    }

    return result as Array<Record<string, unknown>>;
  } catch (err) {
    console.error('[Local Ghost] Sandbox execution error:', err);
    return null;
  }
}
