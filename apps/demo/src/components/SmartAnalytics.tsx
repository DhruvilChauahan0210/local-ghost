import { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useWebGPUAI } from '../hooks/useWebGPUAI';
import type { AnalysisResult } from '../hooks/useWebGPUAI';
import { AIStatusBadge, TerminalLogPanel } from './AIStatusBadge';

export interface SmartAnalyticsProps {
  data: Record<string, unknown>[];
  className?: string;
}

type Status = 'idle' | 'running' | 'done' | 'error';

const COLORS = ['#818cf8','#34d399','#60a5fa','#f472b6','#fb923c','#a78bfa','#2dd4bf','#facc15'];

// ── Data execution — frontend only executes what AI decided ───────────────────
function executeAnalysis(
  result: AnalysisResult,
  data: Record<string, unknown>[]
): { chartData: Record<string, unknown>[]; yKey: string } | null {

  if (result.action === 'filter') {
    const { field, op, value } = result;
    if (!field) return null;
    const filtered = data.filter(row => {
      const cell = row[field];
      const v = value;
      if (op === '>')        return Number(cell) > Number(v);
      if (op === '<')        return Number(cell) < Number(v);
      if (op === '=')        return String(cell).toLowerCase() === String(v).toLowerCase();
      if (op === 'contains') return String(cell).toLowerCase().includes(String(v).toLowerCase());
      return true;
    });
    return { chartData: filtered, yKey: '' };
  }

  if (result.action === 'chart') {
    const { xKey, yKey: rawYKey, aggregation = 'count' } = result;
    if (!xKey) return null;

    const groups: Record<string, number[]> = {};
    for (const row of data) {
      const group = String(row[xKey] ?? 'Unknown');
      if (!groups[group]) groups[group] = [];
      if (aggregation === 'count') {
        groups[group].push(1);
      } else if (rawYKey) {
        const v = Number(row[rawYKey]);
        if (!isNaN(v)) groups[group].push(v);
      }
    }

    const yKey = aggregation === 'count' ? 'count' : `${aggregation}_${rawYKey}`;
    const chartData = Object.entries(groups).map(([key, vals]) => {
      let value: number;
      if (aggregation === 'count')     value = vals.length;
      else if (aggregation === 'avg')  value = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
      else if (aggregation === 'sum')  value = vals.reduce((a,b)=>a+b,0);
      else if (aggregation === 'max')  value = Math.max(...vals);
      else                             value = Math.min(...vals);
      return { [xKey]: key, [yKey]: value };
    });

    return { chartData, yKey };
  }

  return null;
}

// ── Chart renderer ────────────────────────────────────────────────────────────
function renderChart(result: AnalysisResult, chartData: Record<string, unknown>[], yKey: string) {
  const ts = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0px', color: '#e2e8f0' };
  const fmt = (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v);
  const xKey = result.xKey ?? '';

  if (result.type === 'bar') return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
        <Tooltip contentStyle={ts} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
        <Bar dataKey={yKey} fill="#818cf8" radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (result.type === 'line') return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
        <Tooltip contentStyle={ts} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
        <Line type="monotone" dataKey={yKey} stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  if (result.type === 'pie') return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={3}
          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent*100).toFixed(0)}%`}
          labelLine={{ stroke: '#64748b' }}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={ts} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SmartAnalytics({ data, className = '' }: SmartAnalyticsProps) {
  const ai = useWebGPUAI();
  const [query, setQuery]           = useState('');
  const [status, setStatus]         = useState<Status>('idle');
  const [error, setError]           = useState<string | null>(null);
  const [aiDecision, setAiDecision] = useState<AnalysisResult | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown>[]>([]);
  const [yKey, setYKey]             = useState('');

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleGenerate = useCallback(async () => {
    if (!query.trim()) return;
    if (ai.status !== 'ready') return;

    setStatus('running');
    setError(null);
    setAiDecision(null);

    try {
      // AI makes the decision — frontend does NOT pre-classify
      const result = await ai.analyzeData(columns.join(', '), query.trim());
      const executed = executeAnalysis(result, data);

      if (!executed) {
        setError('AI returned an incomplete response. Try rephrasing your query.');
        setStatus('error');
        return;
      }

      setAiDecision(result);
      setResultData(executed.chartData);
      setYKey(executed.yKey);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [ai, columns, data, query]);

  const handleReset = useCallback(() => {
    setQuery(''); setStatus('idle'); setError(null);
    setAiDecision(null); setResultData([]); setYKey('');
  }, []);

  const isFilter = aiDecision?.action === 'filter';
  const isChart  = aiDecision?.action === 'chart';

  return (
    <div className={className}>
      {/* Command bar */}
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z"/></svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">AI Analytics</span>
          </div>
          <AIStatusBadge status={ai.status} progress={ai.progress} mode={ai.mode} error={ai.error} />
        </div>

        {(ai.status === 'uninitialized' || ai.status === 'disposed') && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable AI to use Analytics</p>
              <p className="text-xs text-slate-500 mt-0.5">AI decides chart type, filters, and aggregations entirely.</p>
            </div>
            <button onClick={ai.initAI} className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500">Enable AI (~300MB)</button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleGenerate()}
            placeholder={ai.status === 'ready' ? 'Ask anything: "average salary by role", "employees earning over 100k"…' : 'Enable AI to query your data…'}
            disabled={ai.status !== 'ready' || status === 'running'}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={ai.status !== 'ready' || status === 'running' || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'running'
              ? <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Thinking…</span></>
              : <span>Generate</span>}
          </button>
          {status === 'done' && (
            <button onClick={handleReset} className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700">Reset</button>
          )}
        </div>

        {/* AI decision badge */}
        {status === 'done' && aiDecision && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded border border-slate-600 px-2 py-0.5 font-mono">
              AI decided: {aiDecision.action === 'chart' ? `${aiDecision.type} chart · ${aiDecision.aggregation} of ${aiDecision.yKey} by ${aiDecision.xKey}` : `filter · ${aiDecision.field} ${aiDecision.op} ${aiDecision.value}`}
            </span>
          </div>
        )}

        <TerminalLogPanel logs={ai.systemLogs} visible={ai.status === 'loading'} />

        {status === 'error' && error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Chart result */}
      {status === 'done' && isChart && aiDecision && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{aiDecision.title ?? query}</h3>
            <span className="text-xs text-slate-500 capitalize">{aiDecision.type} chart · {resultData.length} groups</span>
          </div>
          {renderChart(aiDecision, resultData, yKey)}
        </div>
      )}

      {/* Filter result */}
      {status === 'done' && isFilter && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/60">
            <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
            <span className="text-xs font-semibold text-slate-300">Filter Result</span>
            <span className="text-xs text-slate-500">— {resultData.length} of {data.length} rows matched</span>
          </div>
          {resultData.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No rows matched this filter.</div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto table-sticky-header">
              <table className="w-full min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
                    {columns.map(col => <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {resultData.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-transparent hover:bg-slate-800/40 transition-colors' : 'bg-slate-800/20 hover:bg-slate-800/50 transition-colors'}>
                      {columns.map(col => (
                        <td key={col} className="whitespace-nowrap px-4 py-2 text-slate-300">
                          {typeof row[col] === 'number'
                            ? <span className="font-mono text-sky-300 tabular-nums">{(row[col] as number).toLocaleString()}</span>
                            : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/40 bg-[#1a1d27]/50 p-8 text-center">
          <svg className="mb-3 h-10 w-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
          <p className="text-sm text-slate-500">AI will decide whether to show a chart or a filtered table</p>
          <p className="mt-1 text-xs text-slate-600">"average salary by role" · "employees with salary more than 100000" · "count by city"</p>
        </div>
      )}

      {/* Source data table — always visible */}
      <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source Data</span>
          <span className="text-xs text-slate-600">{data.length} rows · {columns.length} columns</span>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto table-sticky-header">
          <table className="w-full min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
                {columns.map(col => <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-transparent hover:bg-slate-800/40 transition-colors' : 'bg-slate-800/20 hover:bg-slate-800/50 transition-colors'}>
                  {columns.map(col => (
                    <td key={col} className="whitespace-nowrap px-4 py-2 text-slate-300">
                      {typeof row[col] === 'number'
                        ? <span className="font-mono text-sky-300 tabular-nums">{(row[col] as number).toLocaleString()}</span>
                        : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
