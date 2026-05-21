'use client';

import { useState, useEffect } from 'react';
import ProjectStats from './ProjectStats';
import ThemeToggle from './ThemeToggle';

const TERMINAL_LINES = [
  { query: 'who earns the most?',                  result: 'Grace Kim — $210,000',    type: 'stat' },
  { query: 'show only engineers',                  result: '5 rows matched',           type: 'filter' },
  { query: 'top 5 earners sorted by salary',       result: '5 rows — ranked table',    type: 'table' },
  { query: 'average salary by role',               result: 'bar chart — 8 groups',     type: 'chart' },
  { query: 'scatter age vs salary',                result: 'scatter — 20 data points', type: 'chart' },
  { query: 'users older than 35, sort by salary',  result: '9 rows matched',           type: 'filter' },
];

type Phase = 'typing' | 'processing' | 'done' | 'deleting';

const TYPE_COLOR: Record<string, string> = {
  stat:   'var(--green)',
  filter: '#60a5fa',
  table:  '#a78bfa',
  chart:  '#f472b6',
};

export default function HomePage() {
  const [lineIndex, setLineIndex]   = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase]           = useState<Phase>('typing');
  const [progress, setProgress]     = useState(0);

  const current = TERMINAL_LINES[lineIndex];

  useEffect(() => {
    if (phase === 'typing') {
      if (displayText.length < current.query.length) {
        const t = setTimeout(() => setDisplayText(current.query.slice(0, displayText.length + 1)), 46);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('processing'), 350);
      return () => clearTimeout(t);
    }
    if (phase === 'processing') {
      if (progress < 100) {
        const t = setTimeout(() => setProgress(p => Math.min(100, p + Math.random() * 18 + 8)), 55);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('done'), 300);
      return () => clearTimeout(t);
    }
    if (phase === 'done') {
      const t = setTimeout(() => setPhase('deleting'), 2200);
      return () => clearTimeout(t);
    }
    if (phase === 'deleting') {
      if (displayText.length > 0) {
        const t = setTimeout(() => setDisplayText(d => d.slice(0, -1)), 16);
        return () => clearTimeout(t);
      }
      setProgress(0);
      setLineIndex(i => (i + 1) % TERMINAL_LINES.length);
      setPhase('typing');
    }
  }, [displayText, phase, progress, current]);

  return (
    <>
      <div className="scanlines" aria-hidden="true" />

      <nav className="nav">
        <span className="nav-logo">LOCAL GHOST<span className="cursor blink">_</span></span>
        <div className="nav-links">
          <a href="https://www.npmjs.com/package/@dhruvil0210/local-ghost" className="nav-link" target="_blank" rel="noreferrer">[ npm ]</a>
          <a href="https://github.com/DhruvilChauahan0210/local-ghost" className="nav-link" target="_blank" rel="noreferrer">[ GitHub ]</a>
          <a href="http://localhost:5173" className="nav-link accent">[ Live Demo ]</a>
          <ThemeToggle />
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="hero">
          <div className="badge">v1.2.0 &mdash; MIT LICENSE &mdash; OPEN SOURCE</div>

          <h1 className="headline">
            ASK YOUR<br />
            DATA<br />
            <span className="headline-accent">ANYTHING.</span>
          </h1>

          <p className="subline">
            Natural language queries. Charts. Stats. Rankings.<br />
            Zero server. Zero API keys. Zero latency.<br />
            Qwen2.5-Coder runs entirely on your GPU.
          </p>

          {/* Terminal */}
          <div className="terminal">
            <div className="terminal-bar">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">local-ghost — v1.2.0</span>
              <span className="terminal-badge" style={{ color: TYPE_COLOR[current.type] }}>
                {current.type.toUpperCase()}
              </span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="prompt">❯</span>
                <span className="typed-text">{displayText}</span>
                {phase === 'typing' && <span className="cursor blink">█</span>}
              </div>

              {(phase === 'processing' || phase === 'done') && (
                <div className="terminal-output">
                  <div className="progress-label">
                    <span>RUNNING ON WEBGPU</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  {phase === 'done' && (
                    <div className="result-line">
                      <span className="result-ok">✓</span>
                      <span style={{ color: TYPE_COLOR[current.type] }}> {current.result} </span>
                      <span className="result-time">in 0ms</span>
                      <span className="result-badge">ON-DEVICE</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="stats">
            {[
              { value: '0ms',  label: 'Server Latency' },
              { value: '$0',   label: 'Infra Cost / Mo' },
              { value: '100%', label: 'On-Device' },
              { value: '4',    label: 'Action Types' },
            ].map(({ value, label }) => (
              <div key={label} className="stat">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="ctas">
            <a href="#install" className="btn btn-primary">GET STARTED →</a>
            <a href="https://github.com/DhruvilChauahan0210/local-ghost" className="btn btn-secondary" target="_blank" rel="noreferrer">VIEW SOURCE</a>
          </div>
        </section>

        {/* ── LIVE PROJECT STATS ── */}
        <div className="section-divider"><span>// LIVE PROJECT STATS</span></div>
        <ProjectStats />

        {/* ── WHAT'S NEW v1.2.0 ── */}
        <div className="section-divider"><span>// WHAT'S NEW IN v1.2.0</span></div>
        <section className="changelog">
          {[
            {
              tag: 'NEW',
              title: 'DEVICE-LOST\nHOT SWAP',
              desc: 'When the OS reclaims GPU memory — sleep cycle, VRAM spike, driver crash, tab freeze — the worker detects the context loss via GPUDevice.lost and seamlessly reinitialises on WASM. No UI errors. No user action required.',
              color: 'var(--green)',
            },
            {
              tag: 'NEW',
              title: 'isProcessing\nLOCK',
              desc: 'AIState now exports isProcessing: boolean — true while any worker request is in-flight. All three dispatchers set and clear it atomically, including every error, timeout, and hotswap path. Race conditions eliminated.',
              color: 'var(--green)',
            },
            {
              tag: 'NEW',
              title: 'CONCURRENCY\nDROP',
              desc: 'Rapid-fire queries no longer destabilise the tensor pipeline. If a ref slot is already occupied, the new request is rejected immediately with a clear message — no stale promises left dangling.',
              color: 'var(--orange)',
            },
            {
              tag: 'HARDENED',
              title: 'HOTSWAP\nUI FLOW',
              desc: 'On device loss the context transitions to loading, logs [LG_HARDENING] WebGPU context lost. Hot-swapping to WASM..., and resolves back to AI Ready — WASM once the fallback pipeline is live.',
              color: 'var(--orange)',
            },
            {
              tag: 'VERIFIED',
              title: 'BUILD\nINVARIANTS',
              desc: 'turbo run build --force: 3/3 tasks clean. Zero console.log or debugger in production bundle. All 7 .d.ts files present. Sourcemaps confirmed. The one eval() grep hit is the literal string inside the security blacklist.',
              color: '#60a5fa',
            },
            {
              tag: 'FIXED',
              title: 'RUNTIME\nMODE REPORT',
              desc: 'After a hot-swap the READY message carries device: "wasm" and the context reads it correctly — mode no longer incorrectly reports "webgpu" after a WASM fallback reinitialisation.',
              color: '#60a5fa',
            },
          ].map(({ tag, title, desc, color }) => (
            <div key={title} className="changelog-card">
              <div className="changelog-tag" style={{ color, borderColor: color + '40' }}>{tag}</div>
              <h3 className="changelog-title" style={{ color }}>{title}</h3>
              <p className="changelog-desc">{desc}</p>
            </div>
          ))}
        </section>

        {/* ── WHAT'S NEW v1.1.0 ── */}
        <div className="section-divider"><span>// WHAT'S NEW IN v1.1.0</span></div>
        <section className="changelog">
          {[
            {
              tag: 'NEW',
              title: 'analyzeData()',
              desc: 'Ask any question in plain English. AI decides whether to return a stat, ranked table, chart, or filtered rows — then the engine executes it deterministically on your data.',
              color: 'var(--green)',
            },
            {
              tag: 'NEW',
              title: 'RULE-BASED\nFALLBACK',
              desc: '15+ regex patterns handle common queries ("who earns most", "top 5", "average X by Y") without LLM inference — instant results even if the model is loading.',
              color: 'var(--green)',
            },
            {
              tag: 'NEW',
              title: 'SCATTER\nCHARTS',
              desc: 'Plot any two numeric fields against each other. "scatter age vs salary" — AI picks the axes, frontend renders a live XY scatter with labelled axes.',
              color: 'var(--orange)',
            },
            {
              tag: 'NEW',
              title: 'VRAM\nMANAGER',
              desc: 'Idle for 5 minutes? The model disposes its GPU bindings automatically. Re-enable with one click. Your battery and memory thank you.',
              color: 'var(--orange)',
            },
            {
              tag: 'FIX',
              title: 'QUERY\nERRORS',
              desc: 'Inference failures no longer permanently kill AI status. QUERY_ERROR, JSON_ERROR, and ANALYSIS_ERROR keep the model ready — only the failed request is rejected.',
              color: '#60a5fa',
            },
            {
              tag: 'FIX',
              title: 'SANDBOX\nHARDENED',
              desc: 'Generated code now runs inside a closure that null-shadows window, document, fetch, localStorage, sessionStorage, XMLHttpRequest, and WebSocket.',
              color: '#60a5fa',
            },
          ].map(({ tag, title, desc, color }) => (
            <div key={title} className="changelog-card">
              <div className="changelog-tag" style={{ color, borderColor: color + '40' }}>{tag}</div>
              <h3 className="changelog-title" style={{ color }}>{title}</h3>
              <p className="changelog-desc">{desc}</p>
            </div>
          ))}
        </section>

        {/* ── COMPONENTS ── */}
        <div className="section-divider"><span>// COMPONENTS</span></div>
        <section className="features">
          {[
            {
              tag: '01',
              title: 'SMART\nDATA GRID',
              desc: 'Natural language filter and sort for any array of objects. "show only engineers sorted by salary desc" — AI generates a sandboxed JS filter, frontend executes it.',
              stat: 'natural language → filtered table',
            },
            {
              tag: '02',
              title: 'SMART\nFORM',
              desc: 'Paste any unstructured text — email, bio, notes — and the AI extracts structured JSON to fill your form fields. Confidence badges show extraction quality per field.',
              stat: 'unstructured text → filled form',
            },
            {
              tag: '03',
              title: 'SMART\nANALYTICS',
              desc: 'Ask anything. AI classifies your query into chart / stat / table / filter and the engine computes results deterministically. Bar, line, pie, scatter all supported.',
              stat: 'any question → chart, stat, or table',
            },
          ].map(({ tag, title, desc, stat }) => (
            <div key={tag} className="feature-card">
              <div className="feature-tag">{tag}</div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
              <div className="feature-stat">{stat}</div>
            </div>
          ))}
        </section>

        {/* ── ANALYTICS API ── */}
        <div className="section-divider"><span>// ANALYTICS ACTION TYPES</span></div>
        <section className="action-grid">
          {[
            {
              action: 'STAT',
              examples: ['who earns the most?', 'average salary', 'total payroll', 'how many employees?', 'youngest person'],
              output: '{ kind: "stat", value: 210000, record: { name: "Grace Kim", ... } }',
              color: 'var(--green)',
            },
            {
              action: 'TABLE',
              examples: ['top 5 earners', 'rank by salary', 'sort by age desc', 'bottom 3 salaries'],
              output: '{ kind: "table", rows: [ ...ranked rows... ] }',
              color: '#a78bfa',
            },
            {
              action: 'CHART',
              examples: ['average salary by role', 'count by city', 'scatter age vs salary', 'salary pie by role'],
              output: '{ kind: "chart", chartData: [...], yKey: "avg_salary" }',
              color: '#f472b6',
            },
            {
              action: 'FILTER',
              examples: ['show engineers', 'salary over 100k', 'employees in New York', 'age > 35'],
              output: '{ kind: "filter", rows: [ ...matched rows... ] }',
              color: '#60a5fa',
            },
          ].map(({ action, examples, output, color }) => (
            <div key={action} className="action-card" style={{ borderLeftColor: color }}>
              <div className="action-label" style={{ color }}>{action}</div>
              <ul className="action-examples">
                {examples.map(ex => (
                  <li key={ex} className="action-example">
                    <span style={{ color }}>❯ </span>{ex}
                  </li>
                ))}
              </ul>
              <div className="action-output">{output}</div>
            </div>
          ))}
        </section>

        {/* ── INSTALL ── */}
        <div className="section-divider"><span>// INSTALL</span></div>
        <section id="install" className="code-section">
          <div className="code-block">
            <div className="code-label">NPM</div>
            <pre><code>
              <span className="c-muted">$</span>{' npm install '}
              <span className="c-green">@dhruvil0210/local-ghost</span>
              {'\n'}
              <span className="c-muted">#</span>{' peer deps: react ^18, recharts ^2'}
            </code></pre>
          </div>

          <div className="code-block">
            <div className="code-label">QUICK START</div>
            <pre><code>
              {'import '}
              <span className="c-orange">{'{ WebGPUAIProvider, SmartDataGrid,'}</span>
              {'\n         '}
              <span className="c-orange">{'SmartForm, SmartAnalytics }'}</span>
              {'\n  from '}
              <span className="c-green">&apos;@dhruvil0210/local-ghost&apos;</span>
              {';\n\nexport default function '}
              <span className="c-yellow">App</span>
              {'() {\n  return (\n    '}
              <span className="c-green">{'<WebGPUAIProvider>'}</span>
              {'\n      '}
              <span className="c-muted">{'/* natural language → filtered table */'}</span>
              {'\n      '}
              <span className="c-green">{'<SmartDataGrid data={myData} />'}</span>
              {'\n\n      '}
              <span className="c-muted">{'/* paste text → auto-filled form */'}</span>
              {'\n      '}
              <span className="c-green">{'<SmartForm fields={fields} onSubmit={save} />'}</span>
              {'\n\n      '}
              <span className="c-muted">{'/* ask anything → chart, stat, table, filter */'}</span>
              {'\n      '}
              <span className="c-green">{'<SmartAnalytics data={myData} />'}</span>
              {'\n    '}
              <span className="c-green">{'</WebGPUAIProvider>'}</span>
              {'\n  );\n}'}
            </code></pre>
          </div>

          <div className="code-block">
            <div className="code-label">analyzeData() — DIRECT API</div>
            <pre><code>
              {'import '}
              <span className="c-orange">{'{ useWebGPUAI }'}</span>
              {' from '}
              <span className="c-green">&apos;@dhruvil0210/local-ghost&apos;</span>
              {';\n\nfunction '}
              <span className="c-yellow">MyComponent</span>
              {'() {\n  const '}
              <span className="c-orange">{'{ analyzeData, status }'}</span>
              {' = useWebGPUAI();\n\n  const result = await '}
              <span className="c-yellow">analyzeData</span>
              {'(\n    '}
              <span className="c-green">&apos;id, name, age, role, salary&apos;</span>
              {',\n    '}
              <span className="c-green">&apos;who earns the most?&apos;</span>
              {'\n  );\n\n  '}
              <span className="c-muted">{'// result.action → "stat"'}</span>
              {'\n  '}
              <span className="c-muted">{'// result.metric → "max"'}</span>
              {'\n  '}
              <span className="c-muted">{'// result.field  → "salary"'}</span>
              {'\n}'}
            </code></pre>
          </div>
        </section>

        {/* ── ARCHITECTURE ── */}
        <div className="section-divider"><span>// ARCHITECTURE</span></div>
        <section className="features">
          {[
            {
              tag: '01',
              title: 'WEBGPU\nACCELERATION',
              desc: 'Qwen2.5-Coder-0.5B runs directly on device GPU via WebGPU API. Automatic WASM fallback for unsupported browsers. 0ms server round-trip.',
              stat: '10× faster than CPU inference',
            },
            {
              tag: '02',
              title: 'DEVICE-LOST\nRECOVERY',
              desc: 'A separate GPUDevice handle monitors the OS-level context. On sleep, VRAM spike, or driver crash — GPUDevice.lost fires, the old pipeline is disposed, and WASM reinitialises automatically.',
              stat: 'zero-downtime GPU → WASM hotswap',
            },
            {
              tag: '03',
              title: 'SECURITY\nSANDBOX',
              desc: 'Generated JS runs in a closure that null-shadows window, document, fetch, localStorage, sessionStorage, XMLHttpRequest, and WebSocket. Token blacklist blocks eval, prototype, and constructor.',
              stat: 'injection-proof execution',
            },
            {
              tag: '04',
              title: 'CONCURRENCY\nLATCHES',
              desc: 'isProcessing lock on AIState prevents race conditions from rapid-fire input. Every resolve, reject, error, hotswap, and dispose path resets the lock — it can never get permanently stuck.',
              stat: 'zero race conditions',
            },
            {
              tag: '05',
              title: 'VRAM\nMANAGEMENT',
              desc: 'After 5 minutes of inactivity the model disposes its GPU bindings automatically. Re-enables on demand with a single click. Battery and memory preserved.',
              stat: '5-min idle → full VRAM purge',
            },
            {
              tag: '06',
              title: 'WEB WORKER\nISOLATION',
              desc: 'All model inference runs in a dedicated Web Worker thread. The main thread stays at 60fps while the AI processes your query. LOG messages stream progress in real time.',
              stat: '0ms UI thread blocking',
            },
          ].map(({ tag, title, desc, stat }) => (
            <div key={tag} className="feature-card">
              <div className="feature-tag">{tag}</div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
              <div className="feature-stat">{stat}</div>
            </div>
          ))}
        </section>

        <footer>
          <div className="footer-inner">
            <span className="footer-logo">LOCAL GHOST_</span>
            <span>
              <span className="c-green">@dhruvil0210/local-ghost@1.2.0</span>
              {' '}· Qwen2.5-Coder + WebGPU · MIT
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
