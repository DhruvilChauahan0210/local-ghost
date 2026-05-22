import { useState, useEffect } from 'react';
import { useWebGPUAI } from '@dhruvil0210/local-ghost';
import Overview     from './pages/Overview';
import Transactions from './pages/Transactions';
import Analytics    from './pages/Analytics';

type Page = 'overview' | 'transactions' | 'analytics';

const NAV = [
  { id: 'overview'     as Page, label: 'Overview',     icon: '⊡' },
  { id: 'transactions' as Page, label: 'Transactions', icon: '↕' },
  { id: 'analytics'   as Page, label: 'Analytics',    icon: '◎' },
];

const BUDGETS = [
  { name: 'Groceries',     pct: 72, color: '#84cc16' },
  { name: 'Food & Dining', pct: 91, color: '#f43f5e' },
  { name: 'Shopping',      pct: 65, color: '#c084fc' },
  { name: 'Transport',     pct: 58, color: '#60a5fa' },
];

function AIStatusDot() {
  const { status } = useWebGPUAI();
  const cls = status === 'ready' ? 'ready' : status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'idle';
  const label = status === 'ready' ? 'AI ready' : status === 'loading' ? 'AI loading…' : status === 'error' ? 'AI error' : 'AI standby';
  return (
    <div className="ai-status-row">
      <span className={`ai-dot ${cls}`} />
      <span className={`ai-status-label ${cls === 'ready' ? 'ready' : ''}`}>{label}</span>
    </div>
  );
}

// Auto-init the AI after a short delay — silently, no UI prompt needed
function AIAutoInit() {
  const { status, initAI } = useWebGPUAI();
  useEffect(() => {
    const t = setTimeout(() => {
      if (status === 'uninitialized') initAI();
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  const [page, setPage]         = useState<Page>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (p: string) => { setPage(p as Page); setMenuOpen(false); };

  return (
    <>
      <AIAutoInit />
      <div className="shell">

        {/* Sidebar overlay (mobile) */}
        {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

        {/* ── Sidebar ── */}
        <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">◈</div>
            <div>
              <div className="sidebar-logo-name">Vault</div>
              <div className="sidebar-logo-tag">Personal Finance</div>
            </div>
          </div>

          {/* Nav */}
          <div className="sidebar-section">
            <div className="sidebar-label">Menu</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(n => (
                <button
                  key={n.id}
                  className={`nav-item${page === n.id ? ' active' : ''}`}
                  onClick={() => navigate(n.id)}
                >
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Budget */}
          <div className="sidebar-section">
            <div className="sidebar-label">Budget Health</div>
            <div className="budget-list">
              {BUDGETS.map(b => (
                <div key={b.name} className="budget-item">
                  <div className="budget-item-head">
                    <span className="budget-item-name">{b.name}</span>
                    <span className="budget-item-pct" style={{ color: b.pct > 85 ? 'var(--red)' : 'var(--text-3)' }}>
                      {b.pct}%
                    </span>
                  </div>
                  <div className="budget-track">
                    <div className="budget-fill" style={{ width: `${b.pct}%`, background: b.pct > 85 ? 'var(--red)' : b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-spacer" />

          {/* Footer */}
          <div className="sidebar-divider" />
          <div className="sidebar-footer">
            <AIStatusDot />
            <div className="sidebar-user">
              <div className="user-avatar">JD</div>
              <div>
                <div className="user-name">Jane Doe</div>
                <div className="user-email">jane@example.com</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">
          {/* Mobile topbar */}
          <header className="topbar">
            <button className="topbar-burger" onClick={() => setMenuOpen(true)}>☰</button>
            <span className="topbar-title">◈ Vault</span>
          </header>

          <div className="main-scroll">
            {page === 'overview'     && <Overview     onNavigate={navigate} />}
            {page === 'transactions' && <Transactions />}
            {page === 'analytics'    && <Analytics />}
          </div>
        </div>

      </div>
    </>
  );
}
