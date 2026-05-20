import { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

type ChartStatus = 'idle' | 'running' | 'done' | 'error';

const CHART_COLORS = [
  '#818cf8', // indigo-400
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#2dd4bf', // teal-400
  '#facc15', // yellow-400
];

function AIStatusBadge({
  status,
  progress,
  error,
  mode,
}: {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  mode: 'webgpu' | 'wasm' | 'server' | null;
}) {
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300">
        <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading model&hellip; {progress}%</span>
      </div>
    );
  }
  if (status === 'ready') {
    const modeLabel =
      mode === 'webgpu' ? 'WebGPU' : mode === 'wasm' ? 'WASM' : mode === 'server' ? 'Server' : 'AI';
    return (
      <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300">
        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        <span>AI Ready &mdash; {modeLabel}</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300" title={error ?? 'Unknown error'}>
        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <span>AI Unavailable</span>
      </div>
    );
  }
  return null;
}

function renderChart(config: ChartConfig, data: Record<string, unknown>[]) {
  if (config.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey={config.xKey}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
            formatter={(value: number) => [value.toLocaleString(), config.yKey]}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
          <Bar dataKey={config.yKey} fill="#818cf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey={config.xKey}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
            formatter={(value: number) => [value.toLocaleString(), config.yKey]}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey={config.yKey}
            stroke="#818cf8"
            strokeWidth={2}
            dot={{ fill: '#818cf8', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#a5b4fc' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey={config.yKey}
            nameKey={config.xKey}
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={60}
            paddingAngle={3}
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: '#64748b' }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
            formatter={(value: number) => [value.toLocaleString(), config.yKey]}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

export function SmartAnalytics({ data, className = '' }: SmartAnalyticsProps) {
  const ai = useWebGPUAI();
  const [query, setQuery] = useState('');
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [chartStatus, setChartStatus] = useState<ChartStatus>('idle');
  const [chartError, setChartError] = useState<string | null>(null);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleGenerateChart = useCallback(async () => {
    if (!query.trim() || ai.status !== 'ready') return;

    setChartStatus('running');
    setChartError(null);

    const schema = columns.join(', ');
    const userInput = `Generate a chart config JSON for: "${query}". Return ONLY: {"type":"bar"|"line"|"pie","xKey":"fieldName","yKey":"fieldName","title":"chart title"}`;

    try {
      const config = await ai.extractJSON(schema, userInput);

      // Validate the extracted config
      const type = config['type'];
      const xKey = config['xKey'];
      const yKey = config['yKey'];
      const title = config['title'] ?? query;

      if (!type || !xKey || !yKey) {
        throw new Error('AI returned an incomplete chart configuration. Try a more specific query.');
      }

      if (type !== 'bar' && type !== 'line' && type !== 'pie') {
        throw new Error(`Unknown chart type "${type}". Expected bar, line, or pie.`);
      }

      if (!columns.includes(xKey)) {
        throw new Error(`Column "${xKey}" not found in data. Available columns: ${columns.join(', ')}`);
      }

      if (!columns.includes(yKey)) {
        throw new Error(`Column "${yKey}" not found in data. Available columns: ${columns.join(', ')}`);
      }

      setChartConfig({ type: type as 'bar' | 'line' | 'pie', xKey, yKey, title });
      setChartStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setChartError(msg);
      setChartStatus('error');
    }
  }, [ai, columns, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        void handleGenerateChart();
      }
    },
    [handleGenerateChart]
  );

  return (
    <div className={className}>
      {/* Command Bar */}
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">AI Analytics</span>
          </div>
          <AIStatusBadge status={ai.status} progress={ai.progress} error={ai.error} mode={ai.mode} />
        </div>

        {ai.status === 'uninitialized' && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Local AI</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Turn natural language into charts &mdash; runs entirely in your browser.
              </p>
            </div>
            <button
              onClick={ai.initAI}
              className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
            >
              Enable AI
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "show salary distribution by role"'
            disabled={ai.status !== 'ready' || chartStatus === 'running'}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Natural language chart query"
          />
          <button
            onClick={() => void handleGenerateChart()}
            disabled={ai.status !== 'ready' || chartStatus === 'running' || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
            aria-label="Generate chart"
          >
            {chartStatus === 'running' ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Generating</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                </svg>
                <span>Generate</span>
              </>
            )}
          </button>
          {chartStatus === 'done' && (
            <button
              onClick={() => {
                setChartConfig(null);
                setChartStatus('idle');
                setQuery('');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 active:scale-95"
              aria-label="Clear chart"
            >
              Clear
            </button>
          )}
        </div>

        {chartStatus === 'error' && chartError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-300">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>
              <strong className="font-semibold">Chart generation failed:</strong> {chartError}
            </span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      {chartStatus === 'done' && chartConfig && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">{chartConfig.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="capitalize">{chartConfig.type} chart</span>
              <span>&middot;</span>
              <span>{data.length} rows</span>
            </div>
          </div>
          {renderChart(chartConfig, data)}
        </div>
      )}

      {/* Empty state */}
      {chartStatus === 'idle' && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-700/40 border-dashed bg-[#1a1d27]/50 p-10 text-center">
          <svg className="mb-3 h-10 w-10 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm text-slate-500">Describe a chart in plain English to visualize your data</p>
          <p className="mt-1 text-xs text-slate-600">e.g. "show average salary per role" or "count employees by city"</p>
        </div>
      )}
    </div>
  );
}
