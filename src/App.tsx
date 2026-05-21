import { useEffect, useState } from 'react';
import { SmartDataGrid } from './components/SmartDataGrid';

interface UserRecord {
  id: number;
  name: string;
  age: number;
  city: string;
  role: string;
  salary: number;
}

const SAMPLE_USERS: UserRecord[] = [
  { id: 1,  name: 'Alice Mercer',   age: 34, city: 'San Francisco', role: 'Engineer',   salary: 145000 },
  { id: 2,  name: 'Bob Tanaka',     age: 27, city: 'New York',       role: 'Designer',   salary: 98000  },
  { id: 3,  name: 'Carol Vance',    age: 41, city: 'Austin',         role: 'Manager',    salary: 172000 },
  { id: 4,  name: 'David Osei',     age: 29, city: 'Seattle',        role: 'Engineer',   salary: 138000 },
  { id: 5,  name: 'Eva Rossi',      age: 36, city: 'Chicago',        role: 'Analyst',    salary: 115000 },
  { id: 6,  name: 'Frank Liu',      age: 23, city: 'Los Angeles',    role: 'Intern',     salary: 52000  },
  { id: 7,  name: 'Grace Kim',      age: 45, city: 'Boston',         role: 'Director',   salary: 210000 },
  { id: 8,  name: 'Henry Park',     age: 31, city: 'Denver',         role: 'Engineer',   salary: 129000 },
  { id: 9,  name: 'Isla Nguyen',    age: 38, city: 'Miami',          role: 'Designer',   salary: 107000 },
  { id: 10, name: 'James Carter',   age: 52, city: 'Atlanta',        role: 'VP',         salary: 285000 },
  { id: 11, name: 'Kayla Brown',    age: 26, city: 'Portland',       role: 'Analyst',    salary: 91000  },
  { id: 12, name: 'Liam Patel',     age: 33, city: 'San Diego',      role: 'Engineer',   salary: 142000 },
  { id: 13, name: 'Mia Torres',     age: 40, city: 'Phoenix',        role: 'Manager',    salary: 165000 },
  { id: 14, name: 'Noah Gonzalez',  age: 22, city: 'San Jose',       role: 'Intern',     salary: 48000  },
  { id: 15, name: 'Olivia Chen',    age: 37, city: 'San Francisco',  role: 'Architect',  salary: 198000 },
  { id: 16, name: 'Pedro Silva',    age: 44, city: 'Houston',        role: 'Director',   salary: 225000 },
  { id: 17, name: 'Quinn Walker',   age: 28, city: 'New York',       role: 'Engineer',   salary: 133000 },
  { id: 18, name: 'Rachel Adams',   age: 35, city: 'Austin',         role: 'Designer',   salary: 112000 },
  { id: 19, name: 'Sam Wilson',     age: 49, city: 'Chicago',        role: 'VP',         salary: 260000 },
  { id: 20, name: 'Tina Zhang',     age: 30, city: 'Seattle',        role: 'Analyst',    salary: 104000 },
];

type Theme = 'dark' | 'light';

function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('lg-theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const resolved = stored ?? preferred;
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lg-theme', next);
  }

  return { theme, toggle };
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', color: 'var(--app-text)', position: 'relative' }}>

      {/* dot-grid texture */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.35,
        backgroundImage: 'radial-gradient(circle, var(--app-border) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000,
        background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem 4rem' }}>

        {/* Nav */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0', height: 52, borderBottom: '1px solid var(--app-border)',
          marginBottom: '2.5rem',
        }}>
          <span style={{
            fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.1em',
            color: 'var(--app-green)', textShadow: '0 0 12px var(--app-glow)',
          }}>
            LOCAL GHOST<span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
              color: 'var(--app-muted)', border: '1px solid var(--app-border)',
              padding: '0.25rem 0.6rem',
            }}>
              v1.2.0
            </span>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                color: 'var(--app-muted)', textDecoration: 'none',
                border: '1px solid transparent', padding: '0.25rem 0.6rem',
              }}
            >
              [ Docs ]
            </a>
            <button
              onClick={toggle}
              style={{
                fontFamily: 'inherit', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', color: 'var(--app-muted)',
                background: 'transparent', border: '1px solid var(--app-border)',
                padding: '0.28rem 0.65rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <span style={{ fontSize: '0.8rem' }}>{theme === 'dark' ? '◑' : '◐'}</span>
              {theme === 'dark' ? 'LIGHT' : 'DARK'}
            </button>
          </div>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em',
              color: 'var(--app-green-dim)', border: '1px solid var(--app-border)',
              padding: '0.25rem 0.65rem', display: 'inline-block', marginBottom: '1rem',
            }}>
              LIVE DEMO — SmartDataGrid
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '0.04em',
            lineHeight: 1.1, marginBottom: '0.75rem',
          }}>
            ASK YOUR DATA{' '}
            <span style={{ color: 'var(--app-green)', textShadow: '0 0 24px var(--app-glow)' }}>
              ANYTHING.
            </span>
          </h1>

          <p style={{
            fontSize: '0.82rem', color: 'var(--app-muted)', lineHeight: 1.8,
            marginBottom: '1.5rem', maxWidth: 520,
          }}>
            Natural language queries — zero server round-trips.<br />
            Qwen2.5-Coder runs entirely on your GPU via WebGPU.
          </p>

          {/* example chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              'show only users older than 30, sorted by name',
              'filter engineers earning over 130000',
              'show top 5 highest salaries',
              'users in San Francisco or New York',
            ].map((ex) => (
              <span
                key={ex}
                style={{
                  fontSize: '0.68rem', letterSpacing: '0.04em',
                  color: 'var(--app-muted)', border: '1px solid var(--app-border)',
                  padding: '0.3rem 0.75rem', background: 'var(--app-surface)',
                }}
              >
                ❯ {ex}
              </span>
            ))}
          </div>
        </header>

        {/* Grid */}
        <SmartDataGrid data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />

        {/* Footer */}
        <footer style={{
          marginTop: '2.5rem',
          borderTop: '1px solid var(--app-border)',
          paddingTop: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.65rem', color: 'var(--app-muted)', letterSpacing: '0.08em',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span>
            <span style={{ color: 'var(--app-green)' }}>@dhruvil0210/local-ghost@1.2.0</span>
            {' '}· Qwen2.5-Coder + WebGPU · MIT
          </span>
          <span>Model runs entirely in your browser — 0ms server latency</span>
        </footer>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
