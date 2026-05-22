import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAppCtx } from '../context/AppContext';
import { CATEGORY_COLORS } from '../data/transactions';

const curr = (n: number, dec = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: dec, minimumFractionDigits: dec }).format(n);

const TS = { backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', padding: '8px 12px' };

function getCategoryEmoji(cat: string) {
  const m: Record<string, string> = { Income:'💰',Rent:'🏠',Groceries:'🛒','Food & Dining':'🍔',Transport:'🚗',Shopping:'🛍️',Entertainment:'🎬',Healthcare:'💊','Health & Fitness':'💪',Utilities:'⚡',Subscriptions:'📺',Travel:'✈️' };
  return m[cat] ?? '💳';
}

export default function Overview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { transactions } = useAppCtx();

  const stats = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp, rate: Math.round(((inc - exp) / inc) * 100) };
  }, [transactions]);

  const monthly = useMemo(() => {
    const m: Record<string, { label: string; income: number; expenses: number }> = {};
    transactions.forEach(t => {
      const k = t.date.slice(0, 7);
      if (!m[k]) m[k] = { label: new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }), income: 0, expenses: 0 };
      if (t.type === 'income') m[k].income += t.amount; else m[k].expenses += t.amount;
    });
    return Object.values(m);
  }, [transactions]);

  const byCategory = useMemo(() => {
    const c: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { c[t.category] = (c[t.category] ?? 0) + t.amount; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  const daily = useMemo(() => {
    const d: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { d[t.date] = (d[t.date] ?? 0) + t.amount; });
    return Object.entries(d).sort().map(([date, amount]) => ({
      day: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Math.round(amount),
    }));
  }, [transactions]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Good morning 👋</h1>
          <p className="page-sub">Apr – May 2025 · {transactions.length} transactions</p>
        </div>
        <button className="btn-green" onClick={() => onNavigate('transactions')}>+ Add Transaction</button>
      </div>

      {/* KPIs */}
      <div className="kpis">
        {[
          { label: 'Net Balance',     val: curr(stats.bal, 2), color: stats.bal >= 0 ? 'var(--green)' : 'var(--red)', accent: stats.bal >= 0 ? '#22c55e' : '#f43f5e', badge: `↑ ${stats.rate}% saved`, badgeCls: 'up' },
          { label: 'Total Income',    val: curr(stats.inc),    color: 'var(--green)',  accent: '#22c55e', badge: `${transactions.filter(t=>t.type==='income').length} deposits`,     badgeCls: 'up' },
          { label: 'Total Expenses',  val: curr(stats.exp),    color: 'var(--red)',    accent: '#f43f5e', badge: `${transactions.filter(t=>t.type==='expense').length} transactions`, badgeCls: 'down' },
          { label: 'Avg Daily Spend', val: curr(stats.exp/60), color: undefined,       accent: '#60a5fa', badge: 'over 60 days', badgeCls: '' },
        ].map(k => (
          <div key={k.label} className="kpi" style={{ borderTop: `2px solid ${k.accent}22`, boxShadow: `0 0 0 0 transparent, inset 0 2px 0 ${k.accent}33` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
            <div className={`kpi-badge ${k.badgeCls}`}>{k.badge}</div>
          </div>
        ))}
      </div>

      {/* Cash flow + category */}
      <div className="row-2">
        <div className="card" style={{ flex: 2 }}>
          <div className="card-head"><span className="card-title">Monthly Cash Flow</span>
            <span className="legend"><span style={{color:'var(--green)'}}>●</span> Income&nbsp;&nbsp;<span style={{color:'var(--red)'}}>●</span> Expenses</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthly} margin={{ top:4, right:4, left:-18, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${Math.round(v)}`} />
              <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
              <Bar dataKey="income"   fill="#22c55e" radius={[3,3,0,0]} opacity={0.85} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[3,3,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head"><span className="card-title">By Category</span></div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {byCategory.map(e => <Cell key={e.name} fill={CATEGORY_COLORS[e.name] ?? '#64748b'} />)}
              </Pie>
              <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="cat-list">
            {byCategory.slice(0,4).map(c => (
              <div key={c.name} className="cat-row">
                <span className="cat-dot" style={{ background: CATEGORY_COLORS[c.name] ?? '#64748b' }} />
                <span className="cat-name">{c.name}</span>
                <span className="cat-amt">{curr(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily trend */}
      <div className="card">
        <div className="card-head"><span className="card-title">Daily Spending</span></div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={daily} margin={{ top:4, right:4, left:-18, bottom:0 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
            <Tooltip contentStyle={TS} formatter={(v:number)=>[curr(v),'Spent']} />
            <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} fill="url(#g)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Recent Transactions</span>
          <button className="btn-ghost" onClick={() => onNavigate('transactions')}>View all →</button>
        </div>
        {transactions.slice(0, 7).map(tx => (
          <div key={tx.id} className="tx-row">
            <div className="tx-icon" style={{ background:`${CATEGORY_COLORS[tx.category] ?? '#64748b'}18`, border:`1px solid ${CATEGORY_COLORS[tx.category] ?? '#64748b'}33` }}>
              {getCategoryEmoji(tx.category)}
            </div>
            <div className="tx-body">
              <div className="tx-merchant">{tx.merchant}</div>
              <div className="tx-meta">
                <span style={{ color: CATEGORY_COLORS[tx.category] ?? '#64748b', fontSize:'0.7rem', fontWeight:500 }}>{tx.category}</span>
                <span className="tx-date">{new Date(tx.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
              </div>
            </div>
            <div className={`tx-amt ${tx.type}`}>{tx.type==='income'?'+':'-'}{curr(tx.amount,2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
