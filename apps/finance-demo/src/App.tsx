import { useState, useMemo } from 'react';
import {
  WebGPUAIProvider,
  SmartDataGrid,
  SmartForm,
  SmartAnalytics,
} from '@dhruvil0210/local-ghost';
import type { SmartFormField } from '@dhruvil0210/local-ghost';
import { TRANSACTIONS } from './data/transactions';
import type { Transaction } from './data/transactions';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSACTION_FIELDS: SmartFormField[] = [
  { name: 'date',     label: 'Date',              type: 'date' },
  { name: 'merchant', label: 'Merchant / Payee',  type: 'text',   placeholder: 'e.g. Amazon, Netflix, Starbucks' },
  { name: 'category', label: 'Category',          type: 'select', options: [
    'Groceries','Food & Dining','Transport','Shopping','Entertainment',
    'Healthcare','Health & Fitness','Utilities','Subscriptions','Travel','Rent','Income','Other',
  ]},
  { name: 'amount',   label: 'Amount (USD)',       type: 'number', placeholder: '0.00' },
  { name: 'type',     label: 'Type',               type: 'select', options: ['expense','income'] },
];

const GRID_HINTS   = ['show food expenses','sort by amount desc','expenses over $100','show subscriptions','transport this month'];
const CHART_HINTS  = ['spending by category','monthly income vs expenses','top 5 merchants','subscription costs'];

type Tab = 'transactions' | 'add' | 'analytics';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub, delay,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'default';
  sub?: string;
  delay?: number;
}) {
  return (
    <div className="vault-stat-card animate-fade-up" style={{ animationDelay: `${delay ?? 0}ms` }}>
      <div className="vault-stat-label">{label}</div>
      <div className={`vault-stat-value ${color ?? ''}`}>{value}</div>
      {sub && <div className={`vault-stat-change ${color === 'green' ? 'up' : color === 'red' ? 'down' : ''}`}>{sub}</div>}
    </div>
  );
}

// ─── How It Works Card ────────────────────────────────────────────────────────

function HowCard({
  icon, tag, title, desc, delay,
}: {
  icon: string; tag: string; title: string; desc: string; delay?: number;
}) {
  return (
    <div className="vault-how-card animate-fade-up" style={{ animationDelay: `${delay ?? 0}ms` }}>
      <div className="vault-how-icon">{icon}</div>
      <div>
        <div className="vault-how-tag">{tag}</div>
        <div className="vault-how-title" style={{ marginTop: '0.25rem' }}>{title}</div>
      </div>
      <div className="vault-how-desc">{desc}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);
  const [activeTab, setActiveTab]       = useState<Tab>('transactions');
  const [addedCount, setAddedCount]     = useState(0);

  const txRecords = useMemo(
    () => transactions as unknown as Record<string, unknown>[],
    [transactions]
  );

  const { income, expenses, balance, savingsRate } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      income: inc,
      expenses: exp,
      balance: inc - exp,
      savingsRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
    };
  }, [transactions]);

  const handleAddTransaction = (values: Record<string, string>) => {
    const newTx: Transaction = {
      id:       transactions.length + 1,
      date:     values.date     || new Date().toISOString().split('T')[0],
      merchant: values.merchant || 'Unknown',
      category: values.category || 'Other',
      amount:   parseFloat(values.amount) || 0,
      type:     (values.type as 'income' | 'expense') || 'expense',
    };
    setTransactions(prev => [newTx, ...prev]);
    setAddedCount(c => c + 1);
    setActiveTab('transactions');
  };

  return (
    <WebGPUAIProvider>
      <div className="relative z-10 min-h-screen">

        {/* ── NAV ── */}
        <nav className="vault-nav">
          <a href="#" className="vault-nav-logo">
            <span className="vault-nav-logo-icon">◈</span>
            VAULT
          </a>
          <div className="vault-nav-links">
            <a
              href="https://local-ghost-docs.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="vault-nav-link"
            >
              Powered by local-ghost
            </a>
            <a
              href="https://github.com/DhruvilChauahan0210/local-ghost"
              target="_blank"
              rel="noreferrer"
              className="vault-nav-link"
              style={{ display: 'none' }}
              aria-hidden
            >
              GitHub
            </a>
            <div className="vault-private-badge">
              <span className="vault-private-dot" />
              PRIVATE
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="vault-hero">
          <div className="animate-fade-up">
            <div className="vault-hero-eyebrow">
              <span>🔒</span>
              Your data never leaves this tab
            </div>
          </div>

          <h1 className="vault-headline animate-fade-up delay-100">
            Finance<br />
            <span className="vault-headline-accent">intelligence,</span><br />
            zero servers.
          </h1>

          <p className="vault-sub animate-fade-up delay-200">
            Query your transactions in plain English. Auto-fill forms from receipts.
            Generate charts with a single sentence. All powered by WebGPU —
            running 100% inside your browser.
          </p>

          <div className="vault-hero-pills animate-fade-up delay-300">
            <span className="vault-hero-pill green">⬡ WebGPU Accelerated</span>
            <span className="vault-hero-pill">0 API Keys Required</span>
            <span className="vault-hero-pill">$0 / month</span>
            <span className="vault-hero-pill">Works Offline</span>
          </div>
        </section>

        {/* ── BALANCE STATS ── */}
        <div style={{ padding: '0 1.5rem', maxWidth: '72rem', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div className="vault-stats-grid">
            <StatCard
              label="Net Balance"
              value={fmtFull(balance)}
              color={balance >= 0 ? 'green' : 'red'}
              sub={`${savingsRate}% savings rate`}
              delay={100}
            />
            <StatCard
              label="Total Income"
              value={fmt(income)}
              color="green"
              sub={`${transactions.filter(t => t.type === 'income').length} deposits`}
              delay={200}
            />
            <StatCard
              label="Total Expenses"
              value={fmt(expenses)}
              color="red"
              sub={`${transactions.filter(t => t.type === 'expense').length} transactions`}
              delay={300}
            />
            <StatCard
              label="Transactions"
              value={String(transactions.length)}
              sub={`${addedCount > 0 ? `+${addedCount} added` : 'Apr – May 2025'}`}
              delay={400}
            />
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div style={{ paddingTop: '3rem' }}>
          <div style={{ padding: '0 1.5rem', maxWidth: '72rem', margin: '0 auto', position: 'relative', zIndex: 10, paddingBottom: '0.5rem' }}>
            <div className="vault-section-title">AI-Powered Features</div>
          </div>
          <div className="vault-how-grid">
            <HowCard
              icon="⊞"
              tag="SmartDataGrid"
              title="Query transactions naturally"
              desc='Type "show food expenses over $50" or "sort by amount descending" — no SQL, no filters, just plain English.'
              delay={100}
            />
            <HowCard
              icon="◎"
              tag="SmartForm"
              title="Auto-fill from any text"
              desc='Paste a receipt, bank email, or text message. The AI extracts merchant, amount, category and fills the form instantly.'
              delay={200}
            />
            <HowCard
              icon="⬡"
              tag="SmartAnalytics"
              title="Charts from plain sentences"
              desc='"Spending by category as a pie chart" or "top 5 merchants by amount" — your data visualized in seconds.'
              delay={300}
            />
          </div>
        </div>

        {/* ── LIVE DASHBOARD ── */}
        <div className="vault-dashboard">
          <div className="vault-section-title">Live Dashboard</div>

          {/* Tabs */}
          <div className="vault-tabs">
            <button
              className={`vault-tab${activeTab === 'transactions' ? ' active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <span>⊞</span> Transactions
            </button>
            <button
              className={`vault-tab${activeTab === 'add' ? ' active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              <span>+</span> Add Transaction
            </button>
            <button
              className={`vault-tab${activeTab === 'analytics' ? ' active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span>◎</span> Analytics
            </button>
          </div>

          {/* Query hints */}
          {activeTab === 'transactions' && (
            <div className="vault-hints">
              <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', alignSelf:'center' }}>Try:</span>
              {GRID_HINTS.map(h => (
                <span key={h} className="vault-hint">"{h}"</span>
              ))}
            </div>
          )}
          {activeTab === 'add' && (
            <div className="vault-hints">
              <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', alignSelf:'center' }}>Paste text like:</span>
              <span className="vault-hint">"Charged $67.43 at Whole Foods on May 15"</span>
              <span className="vault-hint">"Netflix subscription — $15.99 today"</span>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="vault-hints">
              <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', alignSelf:'center' }}>Try:</span>
              {CHART_HINTS.map(h => (
                <span key={h} className="vault-hint">"{h}"</span>
              ))}
            </div>
          )}

          {/* Component area */}
          <div>
            {activeTab === 'transactions' && (
              <SmartDataGrid data={txRecords} />
            )}
            {activeTab === 'add' && (
              <SmartForm
                fields={TRANSACTION_FIELDS}
                onSubmit={handleAddTransaction}
              />
            )}
            {activeTab === 'analytics' && (
              <SmartAnalytics data={txRecords} />
            )}
          </div>
        </div>

        {/* ── INSTALL STRIP ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '2rem 1.5rem',
          marginBottom: '0',
        }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Use in your own app
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--green)', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', padding: '0.5rem 1rem', borderRadius: '8px', letterSpacing: '0.02em' }}>
                npm install @dhruvil0210/local-ghost recharts
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href="https://local-ghost-docs.vercel.app"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.8rem', fontWeight: 600, padding: '0.625rem 1.25rem',
                  background: 'var(--green)', color: '#070b12',
                  borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.02em',
                  transition: 'opacity 0.15s',
                }}
              >
                Read Docs →
              </a>
              <a
                href="https://github.com/DhruvilChauahan0210/local-ghost"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.8rem', fontWeight: 600, padding: '0.625rem 1.25rem',
                  background: 'var(--bg-surface)', color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.02em',
                }}
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span className="vault-footer-logo">VAULT◈</span>
            <span className="vault-footer-text">
              Built with{' '}
              <a href="https://local-ghost-docs.vercel.app" target="_blank" rel="noreferrer"
                style={{ color: 'var(--green)', textDecoration: 'none' }}>
                @dhruvil0210/local-ghost
              </a>
              {' '}· Qwen2.5-Coder + WebGPU · 0 servers · MIT
            </span>
          </div>
        </footer>

      </div>
    </WebGPUAIProvider>
  );
}
