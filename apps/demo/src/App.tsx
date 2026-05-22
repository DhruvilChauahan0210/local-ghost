import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

function resolveTheme(): Theme {
  try {
    const stored = localStorage.getItem('lg-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* localStorage blocked */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const resolved = resolveTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    return resolved;
  });
  useEffect(() => { /* nothing — already applied synchronously in initializer */ }, []);
  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lg-theme', next);
  }
  return { theme, toggle };
}
import { SmartDataGrid } from './components/SmartDataGrid';
import { SmartForm }     from './components/SmartForm';
import { SmartAnalytics } from './components/SmartAnalytics';
import type { SmartFormField } from './components/SmartForm';

/* ─── Dataset ── */
const SAMPLE_USERS = [
  { id: 1,  name: 'Alice Mercer',  age: 34, city: 'San Francisco', role: 'Engineer',  salary: 145000 },
  { id: 2,  name: 'Bob Tanaka',    age: 27, city: 'New York',       role: 'Designer',  salary: 98000  },
  { id: 3,  name: 'Carol Vance',   age: 41, city: 'Austin',         role: 'Manager',   salary: 172000 },
  { id: 4,  name: 'David Osei',    age: 29, city: 'Seattle',        role: 'Engineer',  salary: 138000 },
  { id: 5,  name: 'Eva Rossi',     age: 36, city: 'Chicago',        role: 'Analyst',   salary: 115000 },
  { id: 6,  name: 'Frank Liu',     age: 23, city: 'Los Angeles',    role: 'Intern',    salary: 52000  },
  { id: 7,  name: 'Grace Kim',     age: 45, city: 'Boston',         role: 'Director',  salary: 210000 },
  { id: 8,  name: 'Henry Park',    age: 31, city: 'Denver',         role: 'Engineer',  salary: 129000 },
  { id: 9,  name: 'Isla Nguyen',   age: 38, city: 'Miami',          role: 'Designer',  salary: 107000 },
  { id: 10, name: 'James Carter',  age: 52, city: 'Atlanta',        role: 'VP',        salary: 285000 },
  { id: 11, name: 'Kayla Brown',   age: 26, city: 'Portland',       role: 'Analyst',   salary: 91000  },
  { id: 12, name: 'Liam Patel',    age: 33, city: 'San Diego',      role: 'Engineer',  salary: 142000 },
  { id: 13, name: 'Mia Torres',    age: 40, city: 'Phoenix',        role: 'Manager',   salary: 165000 },
  { id: 14, name: 'Noah Gonzalez', age: 22, city: 'San Jose',       role: 'Intern',    salary: 48000  },
  { id: 15, name: 'Olivia Chen',   age: 37, city: 'San Francisco',  role: 'Architect', salary: 198000 },
  { id: 16, name: 'Pedro Silva',   age: 44, city: 'Houston',        role: 'Director',  salary: 225000 },
  { id: 17, name: 'Quinn Walker',  age: 28, city: 'New York',       role: 'Engineer',  salary: 133000 },
  { id: 18, name: 'Rachel Adams',  age: 35, city: 'Austin',         role: 'Designer',  salary: 112000 },
  { id: 19, name: 'Sam Wilson',    age: 49, city: 'Chicago',        role: 'VP',        salary: 260000 },
  { id: 20, name: 'Tina Zhang',    age: 30, city: 'Seattle',        role: 'Analyst',   salary: 104000 },
];

const FORM_FIELDS: SmartFormField[] = [
  { name: 'name',    label: 'Full Name',           type: 'text',   placeholder: 'Jane Smith' },
  { name: 'email',   label: 'Email',               type: 'email',  placeholder: 'jane@company.com' },
  { name: 'company', label: 'Company',             type: 'text',   placeholder: 'Acme Corp' },
  { name: 'role',    label: 'Role',                type: 'select', options: ['Engineer','Designer','Manager','Analyst','Director','VP','Intern','Architect','Other'] },
  { name: 'salary',  label: 'Annual Salary (USD)', type: 'number', placeholder: '120000' },
];

type Tab = 'grid' | 'form' | 'analytics';

const TABS: { id: Tab; label: string; num: string; desc: string; examples: string[] }[] = [
  {
    id: 'grid', label: 'SMART GRID', num: '01',
    desc: 'Query 20 rows with plain English — zero server round-trips.',
    examples: [
      'show only engineers',
      'users older than 35 sorted by salary',
      'filter by city New York',
      'top 5 highest salaries',
    ],
  },
  {
    id: 'form', label: 'SMART FORM', num: '02',
    desc: 'Paste any unstructured text — AI extracts and fills the fields.',
    examples: [
      `Hi, I'm Jane Smith from TechCorp. Senior Engineer, jane@techcorp.com, $142k/yr.`,
      `Alice Johnson — PM at Acme. alice@acme.com. $165,000 annual.`,
    ],
  },
  {
    id: 'analytics', label: 'SMART ANALYTICS', num: '03',
    desc: 'Describe a chart in plain English — rendered instantly from local data.',
    examples: [
      'average salary by role',
      'count employees by city',
      'salary pie by role',
      'max salary per city',
    ],
  },
];

export default function App() {
  const [active, setActive] = useState<Tab>('grid');
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(null);
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const tab = TABS.find(t => t.id === active)!;

  return (
    <div className="relative z-10 min-h-screen" style={{ fontFamily: 'var(--font)' }}>

      {/* ── NAV ── */}
      <nav className="demo-nav">
        <a href="https://local-ghost-docs.vercel.app" className="demo-nav-logo">
          LOCAL GHOST<span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
          <span className="demo-nav-sep">Live Demo</span>
        </a>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="demo-nav-badge">v1.2.2</span>
          <a href="https://github.com/DhruvilChauahan0210/local-ghost" target="_blank" rel="noreferrer" className="demo-nav-link">
            [ GitHub ]
          </a>
          <button onClick={toggle} className="demo-nav-toggle">
            <span style={{ fontSize: '0.8rem' }}>{theme === 'dark' ? '◑' : '◐'}</span>
            {theme === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
          <button className="demo-nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? '[ ✕ ]' : '[ ≡ ]'}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="demo-mobile-menu" onClick={() => setMenuOpen(false)}>
          <span className="demo-mobile-badge">v1.2.2</span>
          <a href="https://github.com/DhruvilChauahan0210/local-ghost" target="_blank" rel="noreferrer" className="demo-mobile-link">
            [ GitHub ]
          </a>
          <a href="https://local-ghost-docs.vercel.app" className="demo-mobile-link accent">
            [ Docs ]
          </a>
        </div>
      )}

      {/* ── MAIN ── */}
      <main className="demo-main">

        {/* ── HEADER ── */}
        <div className="demo-header">
          <div className="demo-header-badge">v1.2.2 — 3 Components Active</div>
          <h1 className="demo-header-h1">
            LOCAL<br />
            <span style={{ color: 'var(--green)', textShadow: '0 0 30px rgba(0,255,65,0.25)' }}>GHOST.</span>
          </h1>
          <p className="demo-header-sub">
            Three components. Zero servers. Runs entirely on your GPU.<br />
            Switch tabs to test each one live.
          </p>
        </div>

        {/* ── TABS ── */}
        <div className="demo-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`demo-tab${active === t.id ? ' active' : ''}`}
              onClick={() => { setActive(t.id); setSubmitted(null); }}
            >
              <div className="demo-tab-num">{t.num}</div>
              <div className="demo-tab-label">{t.label}</div>
            </button>
          ))}
        </div>

        {/* ── PANEL ── */}
        <div className="demo-panel">
          <div className="demo-panel-header">
            <p className="demo-panel-desc">{tab.desc}</p>
            <div className="demo-panel-chips">
              {tab.examples.slice(0, 3).map(ex => (
                <span key={ex} className="demo-panel-chip">
                  ❯ {ex.length > 36 ? ex.slice(0, 36) + '…' : ex}
                </span>
              ))}
            </div>
          </div>
          <div className="terminal-wrap demo-panel-body">
            {active === 'grid' && (
              <SmartDataGrid data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
            )}
            {active === 'form' && (
              <div>
                <SmartForm fields={FORM_FIELDS} onSubmit={vals => setSubmitted(vals)} />
                {submitted && (
                  <div style={{ marginTop: '1rem', border: '1px solid var(--border)', background: 'rgba(0,255,65,0.04)', padding: '1rem' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--green-dim)', letterSpacing: '0.14em', marginBottom: '0.75rem' }}>✓ FORM SUBMITTED</div>
                    <pre style={{ fontSize: '0.75rem', color: 'var(--green-dim)', fontFamily: 'var(--font)', lineHeight: 1.7, overflow: 'auto' }}>
                      {JSON.stringify(submitted, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            {active === 'analytics' && (
              <SmartAnalytics data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
            )}
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="demo-divider">
          <span className="demo-divider-line" />
          <span>// STACK</span>
          <span className="demo-divider-line" />
        </div>

        {/* ── STATS ── */}
        <div className="demo-stats">
          {[
            { v: '0ms',  l: 'Server Latency' },
            { v: '$0',   l: 'Infra Cost' },
            { v: '100%', l: 'On-Device' },
            { v: '3',    l: 'Components' },
          ].map(({ v, l }) => (
            <div key={l} className="demo-stat">
              <div className="demo-stat-value">{v}</div>
              <div className="demo-stat-label">{l}</div>
            </div>
          ))}
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="demo-footer">
        <span className="demo-footer-logo">LOCAL GHOST_</span>
        <span>@huggingface/transformers · WebGPU → WASM · <span style={{ color: 'var(--green-dim)' }}>0 servers harmed</span></span>
      </footer>
    </div>
  );
}
