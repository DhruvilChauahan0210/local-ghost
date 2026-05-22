import { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { SmartAnalytics } from '@dhruvil0210/local-ghost';
import { useApp } from '../context/AppContext';
import { CATEGORY_COLORS } from '../data/transactions';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const TS = { backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' };
const TICK = { fill: '#64748b', fontSize: 11 };

export default function Analytics() {
  const { transactions, records } = useApp();

  // Spending by category
  const byCat = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] ?? 0) + t.amount;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value), fill: CATEGORY_COLORS[name] ?? '#64748b' }));
  }, [transactions]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      m[t.merchant] = (m[t.merchant] ?? 0) + t.amount;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([merchant, total]) => ({ merchant, total: Math.round(total), count: transactions.filter(t => t.merchant === merchant).length }));
  }, [transactions]);

  // Income vs expenses by month
  const monthly = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number; net: number }> = {};
    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      const label = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!months[key]) months[key] = { month: label, income: 0, expenses: 0, net: 0 };
      if (t.type === 'income') months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.values(months).map(m => ({ ...m, net: Math.round(m.income - m.expenses), income: Math.round(m.income), expenses: Math.round(m.expenses) }));
  }, [transactions]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Insights from Apr – May 2025</p>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Monthly Summary</span>
        </div>
        <div className="summary-table">
          <div className="summary-thead">
            <span>Month</span><span>Income</span><span>Expenses</span><span>Net</span>
          </div>
          {monthly.map(row => (
            <div key={row.month} className="summary-row">
              <span className="summary-month">{row.month}</span>
              <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{fmt(row.income)}</span>
              <span style={{ color: 'var(--red)',   fontFamily: 'var(--font-mono)' }}>{fmt(row.expenses)}</span>
              <span style={{ color: row.net >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {row.net >= 0 ? '+' : ''}{fmt(row.net)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Category Breakdown */}
        <div className="chart-card" style={{ flex: 1 }}>
          <div className="chart-header">
            <span className="chart-title">Spending by Category</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={85} innerRadius={45} paddingAngle={2}>
                {byCat.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={TS} formatter={(v: number) => [fmt(v)]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Bar Chart */}
        <div className="chart-card" style={{ flex: 2 }}>
          <div className="chart-header">
            <span className="chart-title">Expenses by Category</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCat.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ ...TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [fmt(v)]} />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {byCat.slice(0, 7).map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Merchants */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Top Merchants</span>
          <span className="section-sub">by total spend</span>
        </div>
        <div className="merchants-table">
          <div className="merchants-thead">
            <span>Rank</span><span>Merchant</span><span>Transactions</span><span>Total Spent</span>
          </div>
          {topMerchants.map((m, i) => (
            <div key={m.merchant} className="merchants-row">
              <span className="rank">#{i + 1}</span>
              <span className="merchant-name">{m.merchant}</span>
              <span className="merchant-count">{m.count}×</span>
              <span className="merchant-total">{fmt(m.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analytics — clearly marked as AI feature, embedded naturally */}
      <div className="ai-analytics-section">
        <div className="ai-section-header">
          <div className="ai-section-badge">
            <span className="ai-dot" />
            AI-Powered Analysis
          </div>
          <div className="ai-section-desc">
            Ask anything about your data — charts, stats, filters, rankings.
            Runs entirely in your browser.
          </div>
        </div>
        <SmartAnalytics data={records} />
      </div>
    </div>
  );
}
