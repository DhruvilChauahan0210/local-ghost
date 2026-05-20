import { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useWebGPUAI } from '../hooks/useWebGPUAI';

export interface SmartAnalyticsProps {
  data: Record<string, unknown>[];
  className?: string;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  xKey: string;
  yKey: string;
  title: string;
}

type ChartStatus = 'idle' | 'running' | 'done' | 'filtered' | 'error';

const COLORS = ['#818cf8','#34d399','#60a5fa','#f472b6','#fb923c','#a78bfa','#2dd4bf','#facc15'];

// ─── Data aggregation ─────────────────────────────────────────────────────────
type Aggregation = 'count' | 'avg' | 'sum' | 'max' | 'min';

function aggregateData(
  data: Record<string, unknown>[],
  groupByKey: string,
  metricKey: string | null,
  agg: Aggregation
): { chartData: Record<string, unknown>[]; yKey: string } {
  const groups: Record<string, number[]> = {};

  for (const row of data) {
    const group = String(row[groupByKey] ?? 'Unknown');
    if (!groups[group]) groups[group] = [];
    if (agg === 'count') {
      groups[group].push(1);
    } else if (metricKey) {
      const v = Number(row[metricKey]);
      if (!isNaN(v)) groups[group].push(v);
    }
  }

  const yKey = agg === 'count' ? 'count'
    : agg === 'avg' ? `avg_${metricKey}`
    : agg === 'sum' ? `total_${metricKey}`
    : agg === 'max' ? `max_${metricKey}`
    : `min_${metricKey}`;

  const chartData = Object.entries(groups).map(([key, vals]) => {
    let value: number;
    if (agg === 'count')     value = vals.length;
    else if (agg === 'avg')  value = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    else if (agg === 'sum')  value = vals.reduce((a, b) => a + b, 0);
    else if (agg === 'max')  value = Math.max(...vals);
    else                     value = Math.min(...vals);
    return { [groupByKey]: key, [yKey]: value };
  });

  return { chartData, yKey };
}

// ─── Filter query detection & execution ──────────────────────────────────────
function isFilterQuery(query: string): boolean {
  return /\b(name|list|show|who|which|find|get|filter|employee|person|people)\b/i.test(query) &&
    /\b(more than|greater than|less than|older than|younger than|above|below|over|under|with salary|earning|makes?)\b/i.test(query);
}

function applyFilter(query: string, columns: string[], data: Record<string, unknown>[]): Record<string, unknown>[] {
  const q = query.toLowerCase();
  let result = [...data];

  // Numeric comparisons: "salary more than 10000", "age older than 30", etc.
  const gtMatch = q.match(/(\w+)\s*(?:more than|greater than|above|over|older than|>\s*)(\d[\d,]*)/);
  const ltMatch = q.match(/(\w+)\s*(?:less than|below|under|younger than|<\s*)(\d[\d,]*)/);

  if (gtMatch) {
    const field = columns.find(c => c.toLowerCase() === gtMatch[1])
      ?? columns.find(c => q.includes(c.toLowerCase()) && typeof data[0]?.[c] === 'number');
    const val = parseInt(gtMatch[2].replace(/,/g, ''));
    if (field) result = result.filter(row => Number(row[field]) > val);
  }
  if (ltMatch) {
    const field = columns.find(c => c.toLowerCase() === ltMatch[1])
      ?? columns.find(c => q.includes(c.toLowerCase()) && typeof data[0]?.[c] === 'number');
    const val = parseInt(ltMatch[2].replace(/,/g, ''));
    if (field) result = result.filter(row => Number(row[field]) < val);
  }

  // String equality: "in New York", "role is Engineer"
  const strMatch = q.match(/\b(?:in|from|role is|city is|is)\s+["']?([a-z][a-z\s]*)["']?/);
  if (strMatch) {
    const value = strMatch[1].trim();
    const strCols = columns.filter(c => typeof data[0]?.[c] === 'string' && !/^(name|id)$/i.test(c));
    for (const col of strCols) {
      if (q.includes(col.toLowerCase()) || strCols.length === 1) {
        result = result.filter(row => String(row[col]).toLowerCase().includes(value));
        break;
      }
    }
  }

  return result;
}

// ─── Rule-based chart parser ──────────────────────────────────────────────────
function ruleBasedChart(
  query: string,
  columns: string[],
  data: Record<string, unknown>[]
): { config: ChartConfig; chartData: Record<string, unknown>[] } | null {
  const q = query.toLowerCase();

  // Chart type
  let type: 'bar' | 'line' | 'pie' = 'bar';
  if (/pie|proportion|share|percent|breakdown|composition|split/i.test(q)) type = 'pie';
  else if (/line|trend|over time|growth|change|progress/i.test(q)) type = 'line';

  // Group-by field (xKey) — look for "by X", "per X", "each X"
  let xKey = '';
  const byMatch = q.match(/\b(?:by|per|each|group by|grouped by)\s+(\w+)/);
  if (byMatch) {
    xKey = columns.find(c => c.toLowerCase() === byMatch[1]) ?? '';
  }
  if (!xKey) {
    // Pick first string column that isn't 'name' or 'id'
    xKey = columns.find(c =>
      typeof data[0]?.[c] === 'string' && !/^(name|id|email)$/i.test(c)
    ) ?? columns.find(c => typeof data[0]?.[c] === 'string') ?? '';
  }
  if (!xKey) return null;

  // Aggregation
  let agg: Aggregation = 'count';
  let metricKey: string | null = null;

  if (/average|avg|mean/i.test(q)) agg = 'avg';
  else if (/total|sum/i.test(q)) agg = 'sum';
  else if (/max|highest|top/i.test(q)) agg = 'max';
  else if (/min|lowest|bottom/i.test(q)) agg = 'min';

  // Metric field (yKey) — numeric columns
  const numericCols = columns.filter(c => typeof data[0]?.[c] === 'number');
  for (const col of numericCols) {
    if (q.includes(col.toLowerCase())) {
      metricKey = col;
      if (agg === 'count') agg = 'avg'; // mentioned a specific metric → avg it
      break;
    }
  }
  if (!metricKey && agg !== 'count') {
    metricKey = numericCols[0] ?? null;
  }

  const { chartData, yKey } = aggregateData(data, xKey, metricKey, agg);

  return {
    config: { type, xKey, yKey, title: query },
    chartData,
  };
}

// ─── Chart renderer ───────────────────────────────────────────────────────────
function renderChart(config: ChartConfig, chartData: Record<string, unknown>[]) {
  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' };
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  if (config.type === 'bar') return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={config.xKey} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.08)' }} formatter={(v: number) => [v.toLocaleString(), config.yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
        <Bar dataKey={config.yKey} fill="#818cf8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (config.type === 'line') return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey={config.xKey} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), config.yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
        <Line type="monotone" dataKey={config.yKey} stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#a5b4fc' }} />
      </LineChart>
    </ResponsiveContainer>
  );

  if (config.type === 'pie') return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie data={chartData} dataKey={config.yKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={120} innerRadius={55} paddingAngle={3}
          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#64748b' }}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), config.yKey]} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );

  return null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function AIStatusBadge({ status, progress, mode }: {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  progress: number; mode: 'webgpu' | 'wasm' | 'server' | null;
}) {
  if (status === 'loading') return (
    <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300">
      <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <span>Loading model… {progress}%</span>
    </div>
  );
  if (status === 'ready') return (
    <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300">
      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
      <span>AI Ready — {mode === 'webgpu' ? 'WebGPU' : mode === 'wasm' ? 'WASM' : 'Server'}</span>
    </div>
  );
  if (status === 'error') return (
    <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300">
      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd"/></svg>
      <span>AI Unavailable</span>
    </div>
  );
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SmartAnalytics({ data, className = '' }: SmartAnalyticsProps) {
  const ai = useWebGPUAI();
  const [query, setQuery] = useState('');
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [filteredData, setFilteredData] = useState<Record<string, unknown>[]>([]);
  const [chartStatus, setChartStatus] = useState<ChartStatus>('idle');
  const [chartError, setChartError] = useState<string | null>(null);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleGenerateChart = useCallback(async () => {
    if (!query.trim()) return;

    setChartStatus('running');
    setChartError(null);

    // 0. Detect filter queries before hitting LLM or chart parser
    if (isFilterQuery(query)) {
      const rows = applyFilter(query, columns, data);
      setFilteredData(rows);
      setChartStatus('filtered');
      return;
    }

    // 1. Try LLM if available
    if (ai.status === 'ready') {
      try {
        const schema = columns.join(', ');
        const userInput = `Generate a chart config for: "${query}". Return ONLY JSON: {"type":"bar"|"line"|"pie","xKey":"fieldName","yKey":"fieldName","aggregation":"count"|"avg"|"sum","title":"string"}`;
        const raw = await ai.extractJSON(schema, userInput);

        const type = raw['type'] as string;
        const xKey = raw['xKey'] as string;
        const metricField = raw['yKey'] as string;
        const agg = (raw['aggregation'] as Aggregation) ?? 'avg';
        const title = (raw['title'] as string) ?? query;

        if (type && xKey && columns.includes(xKey) && ['bar','line','pie'].includes(type)) {
          const metricKey = columns.includes(metricField) ? metricField : null;
          const { chartData: agg_data, yKey } = aggregateData(data, xKey, metricKey, agg);
          setChartConfig({ type: type as 'bar'|'line'|'pie', xKey, yKey, title });
          setChartData(agg_data);
          setChartStatus('done');
          return;
        }
      } catch (_err) {
        // fall through to rule-based
      }
    }

    // 2. Rule-based fallback
    const result = ruleBasedChart(query, columns, data);
    if (result) {
      setChartConfig(result.config);
      setChartData(result.chartData);
      setChartStatus('done');
    } else {
      setChartError(`Could not parse query. Try: "salary by role", "count by city", "average age per department"`);
      setChartStatus('error');
    }
  }, [ai, columns, data, query]);

  const handleReset = useCallback(() => {
    setChartConfig(null);
    setChartData([]);
    setFilteredData([]);
    setChartStatus('idle');
    setChartError(null);
    setQuery('');
  }, []);

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z"/></svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">AI Analytics</span>
          </div>
          <AIStatusBadge status={ai.status} progress={ai.progress} mode={ai.mode} />
        </div>

        {ai.status === 'uninitialized' && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Local AI</p>
              <p className="text-xs text-slate-500 mt-0.5">Enhances chart generation. Works without AI too.</p>
            </div>
            <button onClick={ai.initAI} className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95">Enable AI</button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleGenerateChart()}
            placeholder='e.g. "average salary by role" or "count employees by city"'
            disabled={chartStatus === 'running'}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          />
          <button
            onClick={() => void handleGenerateChart()}
            disabled={chartStatus === 'running' || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chartStatus === 'running' ? (
              <><svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Working</span></>
            ) : <span>Generate</span>}
          </button>
          {(chartStatus === 'done' || chartStatus === 'filtered') && (
            <button onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700">Reset</button>
          )}
        </div>

        {chartStatus === 'error' && chartError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            <span>{chartError}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartStatus === 'done' && chartConfig && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{chartConfig.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="capitalize">{chartConfig.type} chart</span>
              <span>·</span>
              <span>{chartData.length} groups</span>
            </div>
          </div>
          {renderChart(chartConfig, chartData)}
        </div>
      )}

      {/* Filter result — shows matching rows as a table */}
      {chartStatus === 'filtered' && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
              <span className="text-xs font-semibold text-slate-300">Filter Result</span>
              <span className="text-xs text-slate-500">— {filteredData.length} of {data.length} rows matched</span>
            </div>
          </div>
          {filteredData.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No rows matched this filter.</div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto table-sticky-header">
              <table className="w-full min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
                    {columns.map(col => (
                      <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
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

      {chartStatus === 'idle' && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/40 bg-[#1a1d27]/50 p-8 text-center">
          <svg className="mb-3 h-10 w-10 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
          <p className="text-sm text-slate-500">Describe a chart or filter in plain English</p>
          <p className="mt-1 text-xs text-slate-600">"average salary by role" · "employees with salary more than 100000" · "count by city"</p>
        </div>
      )}

      {/* Raw data table — always visible */}
      <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Source Data
          </span>
          <span className="text-xs text-slate-600">{data.length} rows · {columns.length} columns</span>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto table-sticky-header">
          <table className="w-full min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/80 bg-[#1a1d27]">
                {columns.map(col => (
                  <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? 'bg-transparent hover:bg-slate-800/40 transition-colors' : 'bg-slate-800/20 hover:bg-slate-800/50 transition-colors'}
                >
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
