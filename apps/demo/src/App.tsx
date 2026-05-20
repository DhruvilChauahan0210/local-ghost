import { useState } from 'react';
import { SmartDataGrid } from './components/SmartDataGrid';
import { SmartForm } from './components/SmartForm';
import { SmartAnalytics } from './components/SmartAnalytics';
import type { SmartFormField } from './components/SmartForm';

/* ─── Dataset ──────────────────────────────────────────────────────────────── */
const SAMPLE_USERS = [
  { id: 1,  name: 'Alice Mercer',   age: 34, city: 'San Francisco', role: 'Engineer',  salary: 145000 },
  { id: 2,  name: 'Bob Tanaka',     age: 27, city: 'New York',       role: 'Designer',   salary: 98000  },
  { id: 3,  name: 'Carol Vance',    age: 41, city: 'Austin',         role: 'Manager',    salary: 172000 },
  { id: 4,  name: 'David Osei',     age: 29, city: 'Seattle',        role: 'Engineer',  salary: 138000 },
  { id: 5,  name: 'Eva Rossi',      age: 36, city: 'Chicago',        role: 'Analyst',    salary: 115000 },
  { id: 6,  name: 'Frank Liu',      age: 23, city: 'Los Angeles',    role: 'Intern',     salary: 52000  },
  { id: 7,  name: 'Grace Kim',      age: 45, city: 'Boston',         role: 'Director',   salary: 210000 },
  { id: 8,  name: 'Henry Park',     age: 31, city: 'Denver',         role: 'Engineer',  salary: 129000 },
  { id: 9,  name: 'Isla Nguyen',    age: 38, city: 'Miami',          role: 'Designer',   salary: 107000 },
  { id: 10, name: 'James Carter',   age: 52, city: 'Atlanta',        role: 'VP',         salary: 285000 },
  { id: 11, name: 'Kayla Brown',    age: 26, city: 'Portland',       role: 'Analyst',    salary: 91000  },
  { id: 12, name: 'Liam Patel',     age: 33, city: 'San Diego',      role: 'Engineer',  salary: 142000 },
  { id: 13, name: 'Mia Torres',     age: 40, city: 'Phoenix',        role: 'Manager',    salary: 165000 },
  { id: 14, name: 'Noah Gonzalez',  age: 22, city: 'San Jose',       role: 'Intern',     salary: 48000  },
  { id: 15, name: 'Olivia Chen',    age: 37, city: 'San Francisco',  role: 'Architect',  salary: 198000 },
  { id: 16, name: 'Pedro Silva',    age: 44, city: 'Houston',        role: 'Director',   salary: 225000 },
  { id: 17, name: 'Quinn Walker',   age: 28, city: 'New York',       role: 'Engineer',  salary: 133000 },
  { id: 18, name: 'Rachel Adams',   age: 35, city: 'Austin',         role: 'Designer',   salary: 112000 },
  { id: 19, name: 'Sam Wilson',     age: 49, city: 'Chicago',        role: 'VP',         salary: 260000 },
  { id: 20, name: 'Tina Zhang',     age: 30, city: 'Seattle',        role: 'Analyst',    salary: 104000 },
];

const FORM_FIELDS: SmartFormField[] = [
  { name: 'name',    label: 'Full Name',          type: 'text',   placeholder: 'Jane Smith' },
  { name: 'email',   label: 'Email',              type: 'email',  placeholder: 'jane@company.com' },
  { name: 'company', label: 'Company',            type: 'text',   placeholder: 'Acme Corp' },
  { name: 'role',    label: 'Role',               type: 'select', options: ['Engineer','Designer','Manager','Analyst','Director','VP','Intern','Architect','Other'] },
  { name: 'salary',  label: 'Annual Salary (USD)',type: 'number', placeholder: '120000' },
];

/* ─── Tab config ───────────────────────────────────────────────────────────── */
type TabId = 'grid' | 'form' | 'analytics';

const TABS: {
  id: TabId;
  label: string;
  tagline: string;
  color: 'cyan' | 'amber' | 'violet';
  icon: React.ReactNode;
  examples: string[];
}[] = [
  {
    id: 'grid', label: 'Smart Grid', color: 'cyan',
    tagline: 'Query 20 rows with plain English',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    examples: [
      'show only engineers',
      'users older than 35 sorted by salary',
      'filter by city New York',
      'top 5 highest salaries',
    ],
  },
  {
    id: 'form', label: 'Smart Form', color: 'amber',
    tagline: 'Paste any text — AI fills the fields',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 13l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    examples: [
      `Hi, I'm Jane Smith from TechCorp. Senior Engineer, jane@techcorp.com, $142,000/yr.`,
      `Alice Johnson — Product Manager at Acme. alice@acme.com. Salary: $165k.`,
    ],
  },
  {
    id: 'analytics', label: 'Smart Analytics', color: 'violet',
    tagline: 'Describe a chart — see it instantly',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    examples: [
      'average salary by role',
      'count employees by city',
      'salary pie by role',
      'max salary per city',
    ],
  },
];

const COLOR_MAP = {
  cyan:   { text: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400',   glow: 'glow-cyan',   gradient: 'text-gradient-cyan',   activeBg: 'bg-cyan-500/[0.12]',   activeBorder: 'border-cyan-400/30'   },
  amber:  { text: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400',  glow: 'glow-amber',  gradient: 'text-gradient-amber',  activeBg: 'bg-amber-500/[0.12]',  activeBorder: 'border-amber-400/30'  },
  violet: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25', dot: 'bg-violet-400', glow: 'glow-violet', gradient: 'text-gradient-violet', activeBg: 'bg-violet-500/[0.12]', activeBorder: 'border-violet-400/30' },
};

/* ─── App ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('grid');
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(null);

  const activeConfig = TABS.find(t => t.id === activeTab)!;
  const c = COLOR_MAP[activeConfig.color];

  return (
    <div className="min-h-screen bg-[#050810] font-sans relative overflow-x-hidden">

      {/* ── Aurora background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-cyan-500/[0.06] blur-3xl animate-aurora" />
        <div className="absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full bg-violet-500/[0.05] blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-500/[0.04] blur-3xl" />
      </div>

      {/* ── Dot grid ── */}
      <div className="fixed inset-0 dot-grid pointer-events-none opacity-60" aria-hidden="true" />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        {/* ── Header ── */}
        <header className="mb-10 animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {/* Logo mark */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl glass">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/10" />
                  <svg className="relative h-5 w-5 text-cyan-300" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L2 6v8l8 4 8-4V6L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M2 6l8 4m0 0l8-4m-8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold tracking-tight text-white leading-none">
                    WEBGPU.AI
                  </h1>
                  <p className="font-mono text-[10px] text-slate-600 tracking-widest uppercase mt-0.5">
                    Browser-Native AI Components
                  </p>
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">3 components</span>
              </div>
              <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Phase 3</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <nav className="mb-8 flex gap-1.5 p-1 glass rounded-2xl w-fit" style={{ animationDelay: '0.05s' }}>
          {TABS.map(tab => {
            const tc = COLOR_MAP[tab.color];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSubmitted(null); }}
                className={[
                  'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border',
                  isActive
                    ? `${tc.activeBg} ${tc.text} ${tc.activeBorder} ${tc.glow}`
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <span className={isActive ? tc.text : 'text-slate-600'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Active tab descriptor ── */}
        <div className="mb-6 tab-content" key={`desc-${activeTab}`}>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${c.bg} ${c.border} border ${c.text} mb-3`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {activeConfig.tagline}
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-2">
            {activeConfig.examples.map(ex => (
              <span
                key={ex}
                className="inline-flex items-center glass glass-hover rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono cursor-default transition-all duration-150"
              >
                &ldquo;{ex.length > 48 ? ex.slice(0, 48) + '…' : ex}&rdquo;
              </span>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className={`tab-content component-area ${c.glow} rounded-2xl`} key={activeTab}>

          {/* Colored top accent bar */}
          <div className={`h-[2px] w-full rounded-t-2xl bg-gradient-to-r ${
            activeConfig.color === 'cyan'   ? 'from-cyan-500/80 via-cyan-400/40 to-transparent' :
            activeConfig.color === 'amber'  ? 'from-amber-500/80 via-amber-400/40 to-transparent' :
            'from-violet-500/80 via-violet-400/40 to-transparent'
          }`} />

          <div className="glass rounded-b-2xl rounded-tr-2xl p-5 sm:p-7">

            {activeTab === 'grid' && (
              <SmartDataGrid data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
            )}

            {activeTab === 'form' && (
              <div className="space-y-4">
                <SmartForm
                  fields={FORM_FIELDS}
                  onSubmit={vals => setSubmitted(vals)}
                />
                {submitted && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-fade-up">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                      <span className="text-sm font-semibold text-emerald-300">Submitted</span>
                    </div>
                    <pre className="font-mono text-xs text-emerald-200/60 overflow-auto leading-relaxed">
                      {JSON.stringify(submitted, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <SmartAnalytics data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {(['grid', 'form', 'analytics'] as TabId[]).map((id, i) => {
              const t = TABS[i];
              const tc = COLOR_MAP[t.color];
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${activeTab === id ? `${tc.dot} scale-125` : 'bg-slate-700 hover:bg-slate-500'}`}
                />
              );
            })}
          </div>
          <p className="font-mono text-[10px] text-slate-700 tracking-wider uppercase">
            Powered by @huggingface/transformers · WebGPU → WASM → Server
          </p>
        </footer>

      </div>
    </div>
  );
}
