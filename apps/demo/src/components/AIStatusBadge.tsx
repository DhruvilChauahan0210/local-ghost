interface AIStatusBadgeProps {
  status: 'uninitialized' | 'loading' | 'ready' | 'error' | 'disposed';
  progress: number;
  error: string | null;
  mode: 'webgpu' | 'wasm' | 'server' | null;
}

// Compact pill badge — always stays inline, never full-width
export function AIStatusBadge({ status, progress, mode, error }: AIStatusBadgeProps) {
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 shrink-0">
        <svg className="h-3.5 w-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div className="w-16 h-1 bg-slate-700 overflow-hidden rounded-full">
          <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${progress}%` }}/>
        </div>
        <span className="font-mono tabular-nums">{progress}%</span>
      </div>
    );
  }

  if (status === 'ready') {
    const label = mode === 'webgpu' ? 'WebGPU' : mode === 'wasm' ? 'WASM' : 'Server';
    return (
      <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 shrink-0">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
        </svg>
        <span>AI Ready — {label}</span>
      </div>
    );
  }

  if (status === 'disposed') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300 shrink-0">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
        </svg>
        <span>VRAM freed — idle 5 min</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 shrink-0" title={error ?? ''}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd"/>
        </svg>
        <span>AI Error</span>
      </div>
    );
  }

  return null;
}

// Separate full-width terminal log panel — render below the command bar header
export function TerminalLogPanel({ logs, visible }: { logs: string[]; visible: boolean }) {
  if (!visible || logs.length === 0) return null;
  return (
    <div className="mt-3 bg-slate-900/80 border border-slate-700/60 p-2 space-y-0.5 max-h-28 overflow-y-auto">
      {logs.map((line, i) => (
        <div key={i} className="font-mono text-[10px] leading-relaxed">
          <span className={
            line.includes('[LG_CACHE]')                                   ? 'text-yellow-400' :
            line.includes('active') || line.includes('SUCCESS')           ? 'text-emerald-400' :
            line.includes('ERROR')  || line.includes('failed')            ? 'text-red-400' :
            'text-slate-400'
          }>{line}</span>
        </div>
      ))}
      <div className="font-mono text-[10px] text-indigo-400">❯ <span className="animate-pulse">█</span></div>
    </div>
  );
}
