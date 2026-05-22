import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { CATEGORY_COLORS } from '../data/transactions';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const TS = { backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' };

export default function Overview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { transactions } = useApp();

  const { income, expenses, balance, savingsRate } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income: inc, expenses: exp, balance: inc - exp, savingsRate: Math.round(((inc - exp) / inc) * 100) };
  }, [transactions]);

  // Monthly income vs expenses
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number }> = {};
    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      const label = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, income: 0, expenses: 0 };
      if (t.type === 'income') months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.values(months);
  }, [transactions]);

  // Spending by category (top 6)
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] ?? 0) + t.amount;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  // Daily spending trend (last 30 days)
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      days[t.date] = (days[t.date] ?? 0) + t.amount;
    });
    return Object.entries(days).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Math.round(amount),
    }));
  }, [transactions]);

  const recent = transactions.slice(0, 6);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning 👋</h1>
          <p className="page-sub">Here's your financial overview for Apr – May 2025</p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('transactions')}>
          + Add Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Net Balance</div>
          <div className="kpi-value" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmtFull(balance)}
          </div>
          <div className="kpi-badge green">{savingsRate}% saved</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Income</div>
          <div className="kpi-value">{fmt(income)}</div>
          <div className="kpi-badge green">↑ {transactions.filter(t => t.type === 'income').length} deposits</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Expenses</div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(expenses)}</div>
          <div className="kpi-badge red">↓ {transactions.filter(t => t.type === 'expense').length} transactions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Daily Spend</div>
          <div className="kpi-value">{fmt(expenses / 60)}</div>
          <div className="kpi-badge neutral">over 60 days</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Monthly Income vs Expenses */}
        <div className="chart-card" style={{ flex: 2 }}>
          <div className="chart-header">
            <span className="chart-title">Monthly Cash Flow</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span className="legend-item green">● Income</span>
              <span className="legend-item red">● Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TS} formatter={(v: number) => [fmt(v)]} />
              <Bar dataKey="income"   fill="#22c55e" radius={[4,4,0,0]} opacity={0.85} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Category */}
        <div className="chart-card" style={{ flex: 1 }}>
          <div className="chart-header">
            <span className="chart-title">Top Spending Categories</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={80} paddingAngle={3}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={TS} formatter={(v: number) => [fmt(v)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="cat-legend">
            {categoryData.slice(0, 4).map(c => (
              <div key={c.name} className="cat-legend-item">
                <span className="cat-dot" style={{ background: CATEGORY_COLORS[c.name] ?? '#64748b' }} />
                <span className="cat-name">{c.name}</span>
                <span className="cat-val">{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Spend Trend */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Daily Spending</span>
          <span className="chart-sub">Apr – May 2025</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
              interval={4} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={TS} formatter={(v: number) => [fmt(v), 'Spent']} />
            <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2}
              fill="url(#spendGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Recent Transactions</span>
          <button className="btn-ghost" onClick={() => onNavigate('transactions')}>View all →</button>
        </div>
        <div className="tx-list">
          {recent.map(tx => (
            <div key={tx.id} className="tx-row">
              <div className="tx-icon" style={{ background: `${CATEGORY_COLORS[tx.category]}22`, border: `1px solid ${CATEGORY_COLORS[tx.category]}44` }}>
                <span style={{ fontSize: '0.75rem' }}>{getCategoryEmoji(tx.category)}</span>
              </div>
              <div className="tx-info">
                <div className="tx-merchant">{tx.merchant}</div>
                <div className="tx-meta">
                  <span className="tx-category" style={{ color: CATEGORY_COLORS[tx.category] ?? '#64748b' }}>{tx.category}</span>
                  <span className="tx-date">{new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <div className={`tx-amount ${tx.type}`}>
                {tx.type === 'income' ? '+' : '-'}{fmtFull(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    'Income': '💰', 'Rent': '🏠', 'Groceries': '🛒', 'Food & Dining': '🍔',
    'Transport': '🚗', 'Shopping': '🛍️', 'Entertainment': '🎬',
    'Healthcare': '💊', 'Health & Fitness': '💪', 'Utilities': '⚡',
    'Subscriptions': '📺', 'Travel': '✈️', 'Other': '📦',
  };
  return map[cat] ?? '💳';
}
