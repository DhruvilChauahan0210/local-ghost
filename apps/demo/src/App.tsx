import { useState } from 'react';
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

  const tab = TABS.find(t => t.id === active)!;

  return (
    <div className="relative z-10 min-h-screen" style={{ fontFamily: 'var(--font)' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '52px',
        background: 'rgba(2,4,2,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <a href="http://localhost:3000" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem', letterSpacing: '0.08em',
            color: 'var(--green)',
            textShadow: '0 0 12px rgba(0,255,65,0.4)',
          }}>
            SMARTDATAGRID
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
            Live Demo
          </span>
        </a>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.1em' }}>
            v0.1.0
          </span>
          <a href="https://github.com" style={{
            fontFamily: 'var(--font)', fontSize: '0.7rem', color: 'var(--text-2)',
            textDecoration: 'none', letterSpacing: '0.08em',
            border: '1px solid var(--border)', padding: '0.3rem 0.65rem',
          }}>
            [ GITHUB ]
          </a>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 2rem 6rem' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em',
            color: 'var(--green-dim)',
            border: '1px solid #1a3a1a', padding: '0.25rem 0.65rem',
            marginBottom: '1.25rem', textTransform: 'uppercase',
          }}>
            Phase 3 — 3 Components Active
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 10vw, 7rem)',
            lineHeight: 0.9, letterSpacing: '0.02em',
            color: 'var(--text)', marginBottom: '1rem',
          }}>
            BROWSER<br />
            <span style={{
              color: 'var(--green)',
              textShadow: '0 0 30px rgba(0,255,65,0.25)',
            }}>NATIVE AI.</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.9, maxWidth: '480px' }}>
            Three components. Zero servers. Runs entirely on your GPU.<br />
            Switch tabs to test each one live.
          </p>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div style={{
          display: 'flex', gap: '0',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          marginBottom: '0',
        }}>
          {TABS.map(t => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActive(t.id); setSubmitted(null); }}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  background: isActive ? 'rgba(0,255,65,0.07)' : 'transparent',
                  border: 'none',
                  borderRight: '1px solid var(--border)',
                  borderBottom: isActive ? '2px solid var(--green)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '0.6rem', color: isActive ? 'var(--green-dim)' : 'var(--text-3)', letterSpacing: '0.14em', marginBottom: '0.2rem' }}>
                  {t.num}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem', letterSpacing: '0.06em',
                  color: isActive ? 'var(--green)' : 'var(--text-2)',
                  textShadow: isActive ? '0 0 10px rgba(0,255,65,0.3)' : 'none',
                }}>
                  {t.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{
          border: '1px solid var(--border)',
          borderTop: 'none',
          background: 'var(--surface)',
        }}>
          {/* Content header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', letterSpacing: '0.04em' }}>
              {tab.desc}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {tab.examples.slice(0, 3).map(ex => (
                <span key={ex} style={{
                  fontSize: '0.6rem', fontFamily: 'var(--font)',
                  color: 'var(--text-3)', letterSpacing: '0.04em',
                  border: '1px solid var(--border)',
                  padding: '0.2rem 0.5rem', background: 'var(--surface-2)',
                }}>
                  ❯ {ex.length > 36 ? ex.slice(0, 36) + '…' : ex}
                </span>
              ))}
            </div>
          </div>

          {/* Component */}
          <div className="terminal-wrap" style={{ padding: '1.5rem' }}>
            {active === 'grid' && (
              <SmartDataGrid data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
            )}
            {active === 'form' && (
              <div>
                <SmartForm fields={FORM_FIELDS} onSubmit={vals => setSubmitted(vals)} />
                {submitted && (
                  <div style={{ marginTop: '1rem', border: '1px solid #1a3a1a', background: 'rgba(0,255,65,0.04)', padding: '1rem' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--green-dim)', letterSpacing: '0.14em', marginBottom: '0.75rem' }}>
                      ✓ FORM SUBMITTED
                    </div>
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          margin: '3rem 0 2rem',
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em',
          color: 'var(--text-3)',
        }}>
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span>// STACK</span>
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* ── STAT ROW ── */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
          {[
            { v: '0ms',  l: 'Server Latency' },
            { v: '$0',   l: 'Infra Cost' },
            { v: '100%', l: 'On-Device' },
            { v: '3',    l: 'Components' },
          ].map(({ v, l }) => (
            <div key={l} style={{
              flex: 1, padding: '1.25rem 1.5rem',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.2rem', letterSpacing: '0.04em',
                color: 'var(--green)',
                textShadow: '0 0 20px rgba(0,255,65,0.2)',
                lineHeight: 1, marginBottom: '0.25rem',
              }}>{v}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.5rem',
        fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.06em',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', color: '#1a3a1a' }}>
          SMARTDATAGRID_
        </span>
        <span>
          @huggingface/transformers · WebGPU → WASM → Server ·{' '}
          <span style={{ color: 'var(--green-dim)' }}>0 servers harmed</span>
        </span>
      </footer>
    </div>
  );
}
