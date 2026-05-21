import { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useWebGPUAI } from '../hooks/useWebGPUAI';
import type { AnalysisResult } from '../hooks/useWebGPUAI';

export interface SmartAnalyticsProps {
  data: Record<string, unknown>[];
  className?: string;
}

type Status = 'idle' | 'running' | 'done' | 'error';

const COLORS = ['#818cf8','#34d399','#60a5fa','#f472b6','#fb923c','#a78bfa','#2dd4bf','#facc15'];

type Execution =
  | { kind: 'chart';  chartData: Record<string, unknown>[]; yKey: string }
  | { kind: 'table';  rows: Record<string, unknown>[] }
  | { kind: 'stat';   value: number; formatted: string; record: Record<string, unknown> | null; field: string | null }
  | { kind: 'filter'; rows: Record<string, unknown>[] };

function applyFilter(
  data: Record<string, unknown>[],
  field: string,
  op: string | undefined,
  value: string | number | undefined
): Record<string, unknown>[] {
  if (!field || value === undefined) return data;
  return data.filter(row => {
    const cell = row[field];
    if (op === '>')        return Number(cell) > Number(value);
    if (op === '<')        return Number(cell) < Number(value);
    if (op === '=')        return String(cell).toLowerCase() === String(value).toLowerCase();
    if (op === 'contains') return String(cell).toLowerCase().includes(String(value).toLowerCase());
    return true;
  });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function inferFields(data: Record<string, unknown>[]) {
  if (!data.length) return { numericField: '', stringField: '' };
  const row = data[0];
  const NUM_HINTS = ['salary','age','price','amount','cost','revenue','score','value','rate','income','pay','wage'];
  const STR_HINTS = ['name','city','role','department','type','status','country','team','category','title'];
  const cols = Object.keys(row);
  const numericField = cols.find(c => NUM_HINTS.some(h => c.toLowerCase().includes(h)) && typeof row[c] === 'number')
    ?? cols.find(c => typeof row[c] === 'number') ?? '';
  const stringField  = cols.find(c => STR_HINTS.some(h => c.toLowerCase().includes(h)) && typeof row[c] === 'string')
    ?? cols.find(c => typeof row[c] === 'string') ?? '';
  return { numericField, stringField };
}

function executeAnalysis(result: AnalysisResult, data: Record<string, unknown>[]): Execution {
  const { numericField, stringField } = inferFields(data);

  if (result.action === 'stat') {
    const metric = result.metric ?? 'count';
    const field  = result.field ?? numericField;
    let value = 0;
    let record: Record<string, unknown> | null = null;
    if (metric === 'count') {
      value = data.length;
    } else if (field) {
      const nums = data.map(r => ({ val: Number(r[field]), row: r })).filter(x => !isNaN(x.val));
      if (nums.length) {
        if (metric === 'avg')  value = Math.round(nums.reduce((a,x)=>a+x.val,0) / nums.length);
        else if (metric === 'sum') value = nums.reduce((a,x)=>a+x.val,0);
        else if (metric === 'max') { const m = nums.reduce((a,x)=>x.val>a.val?x:a); value=m.val; record=m.row; }
        else if (metric === 'min') { const m = nums.reduce((a,x)=>x.val<a.val?x:a); value=m.val; record=m.row; }
      }
    }
    return { kind:'stat', value, formatted: value.toLocaleString(), record, field: field||null };
  }

  if (result.action === 'table') {
    const sortBy  = result.sortBy  ?? numericField;
    const sortDir = result.sortDir ?? 'desc';
    let rows = [...data];
    if (result.filterField && result.filterValue !== undefined)
      rows = applyFilter(rows, result.filterField, result.filterOp, result.filterValue);
    if (sortBy) {
      rows.sort((a,b)=>{
        const av=a[sortBy],bv=b[sortBy],dir=sortDir==='desc'?-1:1;
        if(typeof av==='number'&&typeof bv==='number') return (av-bv)*dir;
        return String(av??'').localeCompare(String(bv??''))*dir;
      });
    }
    if (result.limit && result.limit > 0) rows = rows.slice(0, result.limit);
    return { kind:'table', rows };
  }

  if (result.action === 'filter') {
    const field = result.field ?? stringField;
    return { kind:'filter', rows: field ? applyFilter(data, field, result.op, result.value) : [...data] };
  }

  // chart (default fallback)
  const xKey = result.xKey ?? stringField;
  const rawYKey = result.yKey;
  const aggregation = result.aggregation ?? 'count';
  const type = result.type ?? 'bar';

  if (type === 'scatter') {
    const yKey = rawYKey ?? numericField;
    return {
      kind:'chart',
      chartData: data.map(row => ({ [xKey]: Number(row[xKey]??0), [yKey]: Number(row[yKey]??0) })),
      yKey,
    };
  }

  const groups: Record<string,number[]> = {};
  for (const row of data) {
    const g = String(row[xKey]??'Unknown');
    if (!groups[g]) groups[g]=[];
    if (aggregation==='count') groups[g].push(1);
    else if (rawYKey) { const v=Number(row[rawYKey]); if(!isNaN(v)) groups[g].push(v); }
  }
  const yKey = aggregation==='count' ? 'count' : `${aggregation}_${rawYKey}`;
  const chartData = Object.entries(groups).map(([key,vals])=>{
    let value: number;
    if (aggregation==='count')    value=vals.length;
    else if (aggregation==='avg') value=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
    else if (aggregation==='sum') value=vals.reduce((a,b)=>a+b,0);
    else if (aggregation==='max') value=vals.length?Math.max(...vals):0;
    else                          value=vals.length?Math.min(...vals):0;
    return { [xKey]:key, [yKey]:value };
  });
  return { kind:'chart', chartData, yKey };
}

const TS = { backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:'4px', color:'#e2e8f0' };
const TICK = { fill:'#94a3b8', fontSize:11 };
const AXLINE = { stroke:'#475569' };

function renderChart(result: AnalysisResult, chartData: Record<string, unknown>[], yKey: string) {
  const xK = result.xKey ?? '';

  if (result.type === 'scatter') return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top:8, right:16, left:0, bottom:20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey={xK} name={xK} type="number" tick={TICK} axisLine={AXLINE} tickLine={false}
          label={{ value:xK, position:'insideBottom', offset:-10, fill:'#64748b', fontSize:10 }} />
        <YAxis dataKey={yKey} name={yKey} type="number" tick={TICK} axisLine={false} tickLine={false}
          tickFormatter={fmtNum} label={{ value:yKey, angle:-90, position:'insideLeft', fill:'#64748b', fontSize:10 }} />
        <Tooltip contentStyle={TS} cursor={{ strokeDasharray:'3 3', stroke:'#475569' }}
          formatter={(v: number, name: string) => [v.toLocaleString(), name]} />
        <Scatter data={chartData} fill="#818cf8" opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
  if (result.type === 'bar') return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top:8, right:16, left:0, bottom:8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={xK} tick={TICK} axisLine={AXLINE} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmtNum} />
        <Tooltip contentStyle={TS} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color:'#94a3b8', fontSize:'11px' }} />
        <Bar dataKey={yKey} fill="#818cf8" radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
  if (result.type === 'line') return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top:8, right:16, left:0, bottom:8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={xK} tick={TICK} axisLine={AXLINE} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmtNum} />
        <Tooltip contentStyle={TS} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color:'#94a3b8', fontSize:'11px' }} />
        <Line type="monotone" dataKey={yKey} stroke="#818cf8" strokeWidth={2} dot={{ fill:'#818cf8', r:3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
  if (result.type === 'pie') return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData} dataKey={yKey} nameKey={xK} cx="50%" cy="50%"
          outerRadius={110} innerRadius={50} paddingAngle={3}
          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent*100).toFixed(0)}%`}
          labelLine={{ stroke:'#64748b' }}>
          {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={TS} formatter={(v: number) => [v.toLocaleString(), yKey]} />
        <Legend wrapperStyle={{ color:'#94a3b8', fontSize:'11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
  return null;
}

function RowsTable({ rows, columns, showRank=false }: { rows: Record<string,unknown>[]; columns: string[]; showRank?: boolean }) {
  if (!rows.length) return <div className="px-4 py-8 text-center text-sm text-slate-500">No rows matched.</div>;
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
            {showRank && <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">#</th>}
            {columns.map(col=><th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} className={i%2===0?'hover:bg-slate-800/40 transition-colors':'bg-slate-800/20 hover:bg-slate-800/50 transition-colors'}>
              {showRank && <td className="px-4 py-2 text-slate-600 font-mono tabular-nums">{i+1}</td>}
              {columns.map(col=>(
                <td key={col} className="whitespace-nowrap px-4 py-2 text-slate-300">
                  {typeof row[col]==='number'
                    ? <span className="font-mono text-sky-300 tabular-nums">{(row[col] as number).toLocaleString()}</span>
                    : String(row[col]??'')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SmartAnalytics({ data, className = '' }: SmartAnalyticsProps) {
  const ai = useWebGPUAI();
  const [query, setQuery]         = useState('');
  const [status, setStatus]       = useState<Status>('idle');
  const [error, setError]         = useState<string | null>(null);
  const [decision, setDecision]   = useState<AnalysisResult | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleGenerate = useCallback(async () => {
    if (!query.trim() || ai.status !== 'ready') return;
    setStatus('running'); setError(null); setDecision(null); setExecution(null);
    try {
      const result = await ai.analyzeData(columns.join(', '), query.trim());
      setDecision(result);
      setExecution(executeAnalysis(result, data));
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [ai, columns, data, query]);

  const handleReset = useCallback(() => {
    setQuery(''); setStatus('idle'); setError(null); setDecision(null); setExecution(null);
  }, []);

  const decisionSummary = decision ? (() => {
    if (decision.action==='stat')   return `${decision.metric} of ${decision.field??'rows'}`;
    if (decision.action==='table')  return `table · ${decision.sortBy??'—'} ${decision.sortDir??''} ${decision.limit?`· top ${decision.limit}`:''}`;
    if (decision.action==='filter') return `filter · ${decision.field} ${decision.op} ${decision.value}`;
    if (decision.type==='scatter')  return `scatter · ${decision.xKey} vs ${decision.yKey}`;
    return `${decision.type} chart · ${decision.aggregation} by ${decision.xKey}`;
  })() : null;

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">AI Analytics</span>
          </div>
          {ai.status === 'loading' && (
            <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 shrink-0">
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width:`${ai.progress}%` }} />
              </div>
              <span className="font-mono tabular-nums">{ai.progress}%</span>
            </div>
          )}
          {ai.status === 'ready' && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 shrink-0">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
              </svg>
              <span>AI Ready — {ai.mode === 'webgpu' ? 'WebGPU' : ai.mode === 'wasm' ? 'WASM' : 'Server'}</span>
            </div>
          )}
        </div>

        {(ai.status === 'uninitialized' || ai.status === 'disposed') && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable AI Analytics</p>
              <p className="text-xs text-slate-500 mt-0.5">Ask anything — charts, stats, rankings, filters.</p>
            </div>
            <button onClick={ai.initAI} className="ml-4 shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
              Enable AI (~300MB)
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleGenerate()}
            placeholder='e.g. "average salary by role", "who earns the most?", "top 5 earners"'
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

        {status === 'done' && decisionSummary && (
          <div className="mt-3 text-xs text-slate-500">
            <span className="rounded border border-slate-600 px-2 py-0.5 font-mono">AI: {decisionSummary}</span>
          </div>
        )}

        {status === 'error' && error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* STAT */}
      {status === 'done' && execution?.kind === 'stat' && decision && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-[#1a1d27] px-6 py-5 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            {decision.label ?? `${decision.metric} ${decision.field ?? ''}`}
          </p>
          <p className="font-mono text-4xl font-bold text-emerald-400 tracking-tight">{execution.formatted}</p>
          {execution.record && (
            <div className="mt-4 border-t border-slate-700/60 pt-4">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Record</p>
              <div className="flex flex-wrap gap-3">
                {columns.map(col=>(
                  <div key={col} className="flex flex-col">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">{col}</span>
                    <span className={`text-sm font-medium ${col===execution.field?'text-emerald-400 font-mono':'text-slate-300'}`}>
                      {typeof execution.record![col]==='number'
                        ? (execution.record![col] as number).toLocaleString()
                        : String(execution.record![col]??'')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHART */}
      {status === 'done' && execution?.kind === 'chart' && decision && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{decision.title ?? query}</h3>
            <span className="text-xs text-slate-500 capitalize">{decision.type} · {execution.chartData.length} pts</span>
          </div>
          {renderChart(decision, execution.chartData, execution.yKey)}
        </div>
      )}

      {/* TABLE */}
      {status === 'done' && execution?.kind === 'table' && decision && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60">
            <span className="text-xs font-semibold text-slate-300">{decision.title ?? 'Result'}</span>
            <span className="text-xs text-slate-500">{execution.rows.length} rows</span>
          </div>
          <RowsTable rows={execution.rows} columns={columns} showRank={!!decision.sortBy} />
        </div>
      )}

      {/* FILTER */}
      {status === 'done' && execution?.kind === 'filter' && decision && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/60">
            <span className="text-xs font-semibold text-slate-300">{decision.title ?? 'Filter Result'}</span>
            <span className="text-xs text-slate-500">— {execution.rows.length} of {data.length} rows</span>
          </div>
          <RowsTable rows={execution.rows} columns={columns} />
        </div>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/40 bg-[#1a1d27]/50 p-8 text-center">
          <svg className="mb-3 mx-auto h-10 w-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
          </svg>
          <p className="text-sm text-slate-500">Ask anything about your data</p>
          <p className="mt-1 text-xs text-slate-600">"average salary by role" · "who earns the most?" · "top 5 earners" · "scatter age vs salary"</p>
        </div>
      )}
    </div>
  );
}
