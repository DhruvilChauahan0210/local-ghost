import { useState } from 'react';
import { WebGPUAIProvider, useWebGPUAI } from '@dhruvil0210/local-ghost';
import { AppProvider } from './context/AppContext';
import Overview     from './pages/Overview';
import Transactions from './pages/Transactions';
import Analytics    from './pages/Analytics';

type Page = 'overview' | 'transactions' | 'analytics';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',      icon: '◈' },
  { id: 'transactions', label: 'Transactions',  icon: '⊞' },
  { id: 'analytics',    label: 'Analytics',     icon: '◎' },
];

// Sidebar reads AI status from context — shows live indicator without any extra prop drilling
function AIStatusWidget() {
  const ai = useWebGPUAI();

  if (ai.status === 'uninitialized') return (
    <div className="ai-widget idle">
      <div className="ai-widget-label">Local AI</div>
      <div className="ai-widget-status">Not loaded</div>
      <div className="ai-widget-sub">Enable in Transactions or Analytics</div>
    </div>
  );

  if (ai.status === 'loading') return (
    <div className="ai-widget loading">
      <div className="ai-widget-label">Local AI</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="ai-widget-status loading">Loading model… {ai.progress}%</div>
      </div>
      <div className="ai-progress-bar"><div className="ai-progress-fill" style={{ width: `${ai.progress}%` }} /></div>
    </div>
  );

  if (ai.status === 'ready') return (
    <div className="ai-widget ready">
      <div className="ai-widget-label">Local AI</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="ai-ready-dot" />
        <div className="ai-widget-status ready">{ai.mode === 'webgpu' ? 'WebGPU' : ai.mode === 'wasm' ? 'WASM' : 'Server'}</div>
      </div>
      <div className="ai-widget-sub">Ready · 0ms latency</div>
    </div>
  );

  if (ai.status === 'disposed') return (
    <div className="ai-widget idle">
      <div className="ai-widget-label">Local AI</div>
      <div className="ai-widget-status">VRAM freed</div>
      <div className="ai-widget-sub">Re-enable to use AI features</div>
    </div>
  );

  if (ai.status === 'error') return (
    <div className="ai-widget error">
      <div className="ai-widget-label">Local AI</div>
      <div className="ai-widget-status error">Error</div>
      <div className="ai-widget-sub" style={{ color: 'var(--red)' }}>{ai.error?.slice(0, 40)}</div>
    </div>
  );

  return null;
}

function Layout() {
  const [page, setPage]       = useState<Page>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">◈</span>
          <span className="sidebar-logo-text">Vault</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-link${page === item.id ? ' active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-section-label">Budget Health</div>
        <div className="budget-items">
          {BUDGET_ITEMS.map(b => (
            <div key={b.label} className="budget-item">
              <div className="budget-item-header">
                <span className="budget-label">{b.label}</span>
                <span className="budget-pct" style={{ color: b.pct > 85 ? 'var(--red)' : 'var(--text-muted)' }}>{b.pct}%</span>
              </div>
              <div className="budget-bar">
                <div className="budget-fill" style={{ width: `${Math.min(b.pct, 100)}%`, background: b.pct > 85 ? 'var(--red)' : b.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-divider" />
        <AIStatusWidget />

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">JD</div>
            <div>
              <div className="sidebar-user-name">Jane Doe</div>
              <div className="sidebar-user-email">jane@example.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        {/* Top bar (mobile) */}
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-logo">◈ Vault</span>
          <div className="topbar-right">
            <span className="topbar-page">{NAV_ITEMS.find(n => n.id === page)?.label}</span>
          </div>
        </header>

        <div className="main-scroll">
          {page === 'overview'     && <Overview     onNavigate={(p) => setPage(p as Page)} />}
          {page === 'transactions' && <Transactions />}
          {page === 'analytics'    && <Analytics />}
        </div>
      </div>
    </div>
  );
}

const BUDGET_ITEMS = [
  { label: 'Groceries',     pct: 72, color: '#84cc16' },
  { label: 'Food & Dining', pct: 91, color: '#fb923c' },
  { label: 'Shopping',      pct: 65, color: '#c084fc' },
  { label: 'Transport',     pct: 58, color: '#60a5fa' },
];

export default function App() {
  return (
    <WebGPUAIProvider>
      <AppProvider>
        <Layout />
      </AppProvider>
    </WebGPUAIProvider>
  );
}
