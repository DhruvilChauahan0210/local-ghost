import { useState, useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useAppCtx } from '../context/AppContext';
import { useWebGPUAI } from '../hooks/useAI';
import type { AnalysisResult } from '../hooks/useAI';
import { CATEGORY_COLORS } from '../data/transactions';
import type { Transaction } from '../data/transactions';

const curr = (n: number) =>
  new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits: 0 }).format(n);
const currFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits: 2 }).format(n);

const TS = {
  backgroundColor: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
  padding: '8px 12px',
};
const TICK = { fill: '#475569', fontSize: 11 };

const SUGGESTIONS = [
  'average spending by category',
  'top 5 merchants by total',
  'scatter amount vs id',
  'income vs expenses bar',
  'filter expenses over $100',
  'total monthly spend',
];

// ── Turn AnalysisResult + data into chart-ready rows ────────────────

function buildChartData(result: AnalysisResult, data: Transaction[]) {
  const rows = data as unknown as Record<string, unknown>[];
  const numKey = (['amount'] as (keyof Transaction)[]).find(k => typeof data[0]?.[k] === 'number') ?? 'amount';
  const strKey = (['category','merchant','type'] as (keyof Transaction)[])
    .find(k => typeof data[0]?.[k] === 'string') ?? 'category';

  if (result.action === 'stat') {
    const field = result.field ?? String(numKey);
    const nums = rows.map(r => Number(r[field])).filter(n => !isNaN(n));
    let val = 0;
    if (result.metric === 'count')     val = rows.length;
    else if (result.metric === 'avg')  val = nums.reduce((a,b)=>a+b,0) / (nums.length||1);
    else if (result.metric === 'sum')  val = nums.reduce((a,b)=>a+b,0);
    else if (result.metric === 'max')  val = Math.max(...nums);
    else if (result.metric === 'min')  val = Math.min(...nums);
    return { kind: 'stat' as const, val: Math.round(val * 100) / 100, label: result.label ?? `${result.metric} ${field}` };
  }

  if (result.action === 'filter') {
    const field = result.field ?? String(strKey);
    const { op, value } = result;
    const filtered = rows.filter(r => {
      const cell = r[field];
      if (op === '>')        return Number(cell) > Number(value);
      if (op === '<')        return Number(cell) < Number(value);
      if (op === '=')        return String(cell).toLowerCase() === String(value).toLowerCase();
      if (op === 'contains') return String(cell).toLowerCase().includes(String(value).toLowerCase());
      return true;
    });
    return { kind: 'table' as const, rows: filtered.slice(0, 20), columns: Object.keys(rows[0] ?? {}) };
  }

  if (result.action === 'table') {
    const sortBy = result.sortBy ?? String(numKey);
    const dir = result.sortDir === 'asc' ? 1 : -1;
    const sorted = [...rows].sort((a,b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') return (av-bv)*dir;
      return String(av??'').localeCompare(String(bv??''))*dir;
    });
    return { kind: 'table' as const, rows: sorted.slice(0, result.limit ?? 20), columns: Object.keys(rows[0] ?? {}) };
  }

  // chart
  const xKey = result.xKey ?? String(strKey);
  const rawY  = result.yKey;
  const agg   = result.aggregation ?? 'count';
  const type  = result.type ?? 'bar';

  if (type === 'scatter') {
    const numCols = Object.keys(rows[0] ?? {}).filter(k => typeof rows[0][k] === 'number');
    const sx = result.xKey && numCols.includes(result.xKey) ? result.xKey : (numCols[0] ?? xKey);
    const sy = rawY && numCols.includes(rawY) ? rawY : (numCols[1] ?? numCols[0] ?? String(numKey));
    const chartData = rows
      .map(r => ({ [sx]: Number(r[sx]??0), [sy]: Number(r[sy]??0) }))
      .filter(r => !isNaN(r[sx] as number) && !isNaN(r[sy] as number));
    return { kind: 'chart' as const, type, chartData, xKey: sx, yKey: sy };
  }

  const groups: Record<string,number[]> = {};
  for (const row of rows) {
    const g = String(row[xKey] ?? 'Other');
    if (!groups[g]) groups[g] = [];
    if (agg === 'count') groups[g].push(1);
    else if (rawY) { const v = Number(row[rawY]); if (!isNaN(v)) groups[g].push(v); }
  }
  const yKey = agg === 'count' ? 'count' : `${agg}_${rawY}`;
  const chartData = Object.entries(groups).map(([k, vals]) => {
    let value: number;
    if (agg === 'count')   value = vals.length;
    else if (agg === 'avg') value = Math.round(vals.reduce((a,b)=>a+b,0)/(vals.length||1));
    else if (agg === 'sum') value = vals.reduce((a,b)=>a+b,0);
    else if (agg === 'max') value = Math.max(...vals);
    else                    value = Math.min(...vals);
    return { [xKey]: k, [yKey]: value };
  });

  return { kind: 'chart' as const, type, chartData, xKey, yKey };
}

function AiResultRenderer({ result, data }: { result: AnalysisResult, data: Transaction[] }) {
  const built = buildChartData(result, data);
  const palette = ['#22c55e','#f43f5e','#818cf8','#f59e0b','#60a5fa','#f472b6','#34d399','#c084fc'];

  if (built.kind === 'stat') {
    const isMonetary = built.label.toLowerCase().includes('amount') || built.label.toLowerCase().includes('spend') || built.label.toLowerCase().includes('total') || built.label.toLowerCase().includes('avg');
    return (
      <div className="stat-result-card">
        <div>
          <div className="stat-result-label">{built.label}</div>
          <div className="stat-result-num">
            {isMonetary ? currFull(built.val) : built.val.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  if (built.kind === 'table') {
    const cols = built.columns.slice(0, 5);
    return (
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {built.rows.map((row, i) => (
              <tr key={i}>{cols.map(c => (
                <td key={c}>{
                  c === 'amount'
                    ? <span style={{ fontFamily:'var(--mono)', color: (row['type']==='income'?'var(--green)':'var(--red)') }}>{currFull(Number(row[c]))}</span>
                    : String(row[c] ?? '')
                }</td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // chart
  const { chartData, xKey, yKey, type } = built;
  if (!chartData.length) return <div className="empty-state">No data to chart.</div>;

  if (type === 'pie') return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%"
          outerRadius={110} innerRadius={55} paddingAngle={2}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${String(name).slice(0,12)} ${(percent*100).toFixed(0)}%`
          }
          labelLine={{ stroke:'#475569' }}>
          {chartData.map((_,i) => <Cell key={i} fill={palette[i % palette.length]} />)}
        </Pie>
        <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
        <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );

  if (type === 'line') return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top:4,right:12,left:-16,bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v),yKey]} />
        <Line type="monotone" dataKey={yKey} stroke="#22c55e" strokeWidth={2} dot={{ fill:'#22c55e', r:3 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  if (type === 'scatter') return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top:4,right:12,left:-16,bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xKey} type="number" tick={TICK} axisLine={false} tickLine={false} name={xKey} />
        <YAxis dataKey={yKey} type="number" tick={TICK} axisLine={false} tickLine={false} name={yKey} />
        <Tooltip contentStyle={TS} cursor={{ stroke:'#475569',strokeDasharray:'3 3' }} />
        <Scatter data={chartData} fill="#818cf8" opacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top:4,right:12,left:-16,bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
        <Bar dataKey={yKey} radius={[3,3,0,0]}>
          {chartData.map((_,i) => <Cell key={i} fill={palette[i % palette.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function Analytics() {
  const { transactions, schema } = useAppCtx();
  const ai = useWebGPUAI();

  const [askQuery, setAskQuery]   = useState('');
  const [askResult, setAskResult] = useState<AnalysisResult | null>(null);
  const [asking, setAsking]       = useState(false);
  const [askLabel, setAskLabel]   = useState('');

  // ── Prebuilt insight data ─────────────────────────────────────────
  const monthly = useMemo(() => {
    const m: Record<string,{label:string;income:number;expenses:number}> = {};
    transactions.forEach(t => {
      const k = t.date.slice(0,7);
      if (!m[k]) m[k] = { label: new Date(t.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}), income:0, expenses:0 };
      if (t.type==='income') m[k].income += t.amount; else m[k].expenses += t.amount;
    });
    return Object.values(m).map(r=>({ ...r, net: r.income - r.expenses, income:Math.round(r.income), expenses:Math.round(r.expenses) }));
  }, [transactions]);

  const topMerchants = useMemo(() => {
    const m: Record<string,number> = {};
    transactions.filter(t=>t.type==='expense').forEach(t => { m[t.merchant]=(m[t.merchant]??0)+t.amount; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([merchant,total],i)=>({ rank:i+1, merchant, total:Math.round(total), count: transactions.filter(t=>t.merchant===merchant).length }));
  }, [transactions]);

  const byCat = useMemo(() => {
    const c: Record<string,number> = {};
    transactions.filter(t=>t.type==='expense').forEach(t=>{ c[t.category]=(c[t.category]??0)+t.amount; });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({ name, value:Math.round(value) }));
  }, [transactions]);

  const monthlyArea = useMemo(() =>
    monthly.map(m => ({
      month: m.label.split(' ')[0],
      Income: m.income,
      Expenses: m.expenses,
    }))
  , [monthly]);

  // ── Ask your data ─────────────────────────────────────────────────
  const handleAsk = async () => {
    if (!askQuery.trim()) return;
    if (ai.status === 'uninitialized' || ai.status === 'disposed') { ai.initAI(); return; }
    if (ai.status !== 'ready') return;

    setAsking(true);
    setAskResult(null);
    const label = askQuery.trim();

    try {
      const result = await ai.analyzeData(schema, label);
      setAskResult(result);
      setAskLabel(label);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Apr – May 2025</p>
        </div>
      </div>

      {/* ── Monthly summary ── */}
      <div className="card">
        <div className="card-head"><span className="card-title">Monthly Summary</span></div>
        <table className="sum-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net Savings</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(m => (
              <tr key={m.label}>
                <td style={{ fontWeight:600, color:'var(--text)' }}>{m.label}</td>
                <td><span className="sum-mono" style={{ color:'var(--green)' }}>{curr(m.income)}</span></td>
                <td><span className="sum-mono" style={{ color:'var(--red)' }}>{curr(m.expenses)}</span></td>
                <td><span className="sum-mono" style={{ color: m.net>=0?'var(--green)':'var(--red)', fontWeight:700 }}>
                  {m.net>=0?'+':''}{curr(m.net)}
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Charts row ── */}
      <div className="analytics-grid">
        {/* Category bar */}
        <div className="card" style={{ margin:0 }}>
          <div className="card-head"><span className="card-title">Expenses by Category</span></div>
          <div style={{ padding:'16px 8px 16px 0' }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={byCat.slice(0,7)} layout="vertical" margin={{ top:0,right:12,left:90,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ ...TICK, fontSize:11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {byCat.slice(0,7).map(e=><Cell key={e.name} fill={CATEGORY_COLORS[e.name]??'#64748b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs expenses */}
        <div className="card" style={{ margin:0 }}>
          <div className="card-head">
            <span className="card-title">Income vs Expenses</span>
            <div className="legend">
              <span style={{color:'var(--green)'}}>● Income</span>
              <span style={{color:'var(--red)'}}>● Expenses</span>
            </div>
          </div>
          <div style={{ padding:'16px 8px 16px 0' }}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyArea} margin={{ top:4,right:12,left:-16,bottom:0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
                <Area type="monotone" dataKey="Income"   stroke="#22c55e" strokeWidth={2} fill="url(#gInc)" dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#gExp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top merchants ── */}
      <div className="card">
        <div className="card-head"><span className="card-title">Top Merchants by Spend</span></div>
        <table className="sum-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Merchant</th>
              <th style={{ textAlign:'center' }}>Transactions</th>
              <th style={{ textAlign:'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {topMerchants.map(m => (
              <tr key={m.merchant}>
                <td style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-3)' }}>#{m.rank}</td>
                <td style={{ fontWeight:600, color:'var(--text)' }}>{m.merchant}</td>
                <td style={{ textAlign:'center', color:'var(--text-3)', fontSize:12 }}>{m.count}×</td>
                <td style={{ textAlign:'right' }}>
                  <span className="sum-mono" style={{ color:'var(--red)' }}>{curr(m.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Ask your data ── */}
      <div className="ask-section">
        <div className="ask-header">
          <div>
            <div className="ask-title">Ask your data anything</div>
            <div className="ask-desc">
              Describe a chart, stat, or filter in plain English. Results render instantly.
            </div>
          </div>
        </div>

        <div className="ask-body">
          <div className="ask-bar">
            <div className="ask-input-wrap">
              <input
                type="text"
                className="ask-input"
                placeholder="e.g. &quot;average amount by category&quot;, &quot;top 5 merchants&quot;, &quot;filter transport expenses&quot;…"
                value={askQuery}
                onChange={e => setAskQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleAsk(); }}
                disabled={asking}
              />
            </div>
            <button
              className="ask-btn"
              onClick={handleAsk}
              disabled={!askQuery.trim() || asking}
            >
              {asking
                ? <span className="search-spinner" style={{ width:14,height:14,borderWidth:2 }} />
                : '→'}
            </button>
          </div>

          {/* Suggestion pills */}
          {!askResult && (
            <div className="suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="suggestion" onClick={() => { setAskQuery(s); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Result */}
          {askResult && (
            <div className="ask-result">
              <div className="ask-result-label">{askLabel}</div>
              <AiResultRenderer result={askResult} data={transactions} />
            </div>
          )}

          {/* AI loading state */}
          {asking && (
            <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8, color:'var(--text-3)', fontSize:12 }}>
              <span className="search-spinner" />
              Analyzing your data…
            </div>
          )}

          {/* If AI not ready and user tries */}
          {ai.status === 'loading' && !asking && (
            <div style={{ marginTop:12, fontSize:12, color:'var(--text-3)' }}>
              AI is loading in the background — will be ready in a moment.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
