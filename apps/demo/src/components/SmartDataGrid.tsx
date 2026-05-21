import { useState, useCallback, useRef } from 'react';
import { useWebGPUAI } from '../hooks/useWebGPUAI';
import { AIStatusBadge, TerminalLogPanel } from './AIStatusBadge';

interface SmartDataGridProps {
  data: Record<string, unknown>[];
}

type QueryStatus = 'idle' | 'running' | 'error' | 'stat';

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-600 italic">null</span>;
  }
  if (typeof value === 'number') {
    return (
      <span className="font-mono text-sky-300 tabular-nums">
        {value.toLocaleString()}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

export function SmartDataGrid({ data }: SmartDataGridProps) {
  const ai = useWebGPUAI();
  const [query, setQuery] = useState('');
  const [displayData, setDisplayData] = useState<Record<string, unknown>[]>(data);
  const [queryStatus, setQueryStatus] = useState<QueryStatus>('idle');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [statResult, setStatResult] = useState<{ label: string; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleRunQuery = useCallback(async () => {
    if (!query.trim() || ai.status !== 'ready') return;

    setQueryStatus('running');
    setQueryError(null);
    setStatResult(null);

    const schema = columns.join(', ');

    try {
      const { code, usedFallback: fb } = await ai.runQuery(schema, query.trim());
      setUsedFallback(fb);

      // Hardened sandbox: shadow dangerous globals with null
      const sandboxed = new Function(
        'data', 'window', 'document', 'fetch', 'localStorage', 'sessionStorage',
        `"use strict"; const fn = ${code}; return fn(data);`
      );
      const result = sandboxed(data, null, null, null, null, null) as unknown;

      if (Array.isArray(result)) {
        setDisplayData(result as Record<string, unknown>[]);
        setQueryStatus('idle');
      } else if (typeof result === 'number' || typeof result === 'string' || typeof result === 'boolean') {
        // AI computed a scalar (count, average, etc.) — surface it as a stat card
        const formatted = typeof result === 'number' ? result.toLocaleString() : String(result);
        setStatResult({ label: query.trim(), value: formatted });
        setDisplayData(data); // restore full table below the stat
        setQueryStatus('stat');
      } else {
        throw new TypeError(`AI code returned ${typeof result} — expected an array. For aggregations try the Analytics tab.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setQueryError(msg);
      setQueryStatus('error');
    }
  }, [ai, columns, data, query]);

  const handleReset = useCallback(() => {
    setDisplayData(data);
    setQuery('');
    setQueryStatus('idle');
    setQueryError(null);
    setUsedFallback(false);
    setStatResult(null);
    inputRef.current?.focus();
  }, [data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        void handleRunQuery();
      }
    },
    [handleRunQuery]
  );

  const isFiltered = queryStatus !== 'stat' && displayData.length !== data.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Command Bar */}
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg
                className="h-4 w-4 text-indigo-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">
              Natural Language Query
            </span>
          </div>
          <AIStatusBadge
            status={ai.status}
            progress={ai.progress}
            error={ai.error}
            mode={ai.mode}
          />
        </div>

        {(ai.status === 'uninitialized' || ai.status === 'disposed') && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Local AI</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Runs 100% in your browser &mdash; no server, no API key.
                Downloads ~300MB once, then cached forever.
              </p>
            </div>
            <button
              onClick={ai.initAI}
              className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Enable AI (~300MB)
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "show only users older than 30, sorted by name"'
            disabled={ai.status !== 'ready' || queryStatus === 'running'}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Natural language data query"
          />
          <button
            onClick={() => void handleRunQuery()}
            disabled={
              ai.status !== 'ready' ||
              queryStatus === 'running' ||
              !query.trim()
            }
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
            aria-label="Run query"
          >
            {queryStatus === 'running' ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Running</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Run</span>
              </>
            )}
          </button>
          {(isFiltered || queryStatus === 'error' || queryStatus === 'stat') && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 active:scale-95"
              aria-label="Reset to original data"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z"
                  clipRule="evenodd"
                />
              </svg>
              Reset
            </button>
          )}
        </div>

        {queryStatus === 'error' && queryError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-300">
            <svg
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong className="font-semibold">Query failed:</strong>{' '}
              {queryError}
            </span>
          </div>
        )}

        <TerminalLogPanel logs={ai.systemLogs} visible={ai.status === 'loading'} />
      </div>

      {/* Stat card — when AI returned a scalar instead of rows */}
      {queryStatus === 'stat' && statResult && (
        <div className="rounded-xl border border-emerald-500/20 bg-[#1a1d27] px-6 py-5 shadow-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{statResult.label}</p>
            <p className="font-mono text-4xl font-bold text-emerald-400 tracking-tight">{statResult.value}</p>
          </div>
          <p className="text-xs text-slate-600 max-w-[200px] text-right leading-relaxed">
            For charts, averages, and breakdowns use the{' '}
            <span className="text-slate-400">Analytics</span> tab.
          </p>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Showing{' '}
            <span className="font-semibold text-slate-200">
              {displayData.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-200">{data.length}</span>{' '}
            rows
          </span>
          {isFiltered && (
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
              Filtered
            </span>
          )}
          {usedFallback && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20" title="AI produced invalid code — basic pattern matching used as repair">
              Basic repair
            </span>
          )}
        </div>
        <span className="text-xs text-slate-600">
          {columns.length} column{columns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] table-sticky-header">
          <table className="w-full min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="h-8 w-8 text-slate-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <span className="text-sm">No results found</span>
                      <button
                        onClick={handleReset}
                        className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                      >
                        Clear filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={
                      rowIndex % 2 === 0
                        ? 'bg-transparent hover:bg-slate-800/40 transition-colors'
                        : 'bg-slate-800/20 hover:bg-slate-800/50 transition-colors'
                    }
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="whitespace-nowrap px-5 py-3 text-slate-300"
                      >
                        <CellValue value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
