'use client';

import { useState, useEffect } from 'react';

const DEMO_QUERIES = [
  'show users older than 30, sorted by salary desc',
  'filter engineers in New York',
  'top 5 highest paid employees',
  'show only managers, sort by name',
];

const ROW_COUNTS = [12, 8, 5, 6];

type Phase = 'typing' | 'processing' | 'done' | 'deleting';

export default function HomePage() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const query = DEMO_QUERIES[queryIndex];

    if (phase === 'typing') {
      if (displayText.length < query.length) {
        const t = setTimeout(
          () => setDisplayText(query.slice(0, displayText.length + 1)),
          48
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('processing'), 400);
      return () => clearTimeout(t);
    }

    if (phase === 'processing') {
      if (progress < 100) {
        const t = setTimeout(
          () => setProgress(p => Math.min(100, p + Math.random() * 14 + 6)),
          70
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('done'), 400);
      return () => clearTimeout(t);
    }

    if (phase === 'done') {
      const t = setTimeout(() => setPhase('deleting'), 1800);
      return () => clearTimeout(t);
    }

    if (phase === 'deleting') {
      if (displayText.length > 0) {
        const t = setTimeout(() => setDisplayText(d => d.slice(0, -1)), 18);
        return () => clearTimeout(t);
      }
      setProgress(0);
      setQueryIndex(i => (i + 1) % DEMO_QUERIES.length);
      setPhase('typing');
    }
  }, [displayText, phase, progress, queryIndex]);

  return (
    <>
      <div className="scanlines" aria-hidden="true" />

      <nav className="nav">
        <span className="nav-logo">
          LOCAL GHOST<span className="cursor blink">_</span>
        </span>
        <div className="nav-links">
          <a href="https://github.com" className="nav-link">[ GitHub ]</a>
          <a href="http://localhost:5173" className="nav-link accent">[ Live Demo ]</a>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="hero">
          <div className="badge">v1.0.0 &mdash; MIT LICENSE &mdash; OPEN SOURCE</div>

          <h1 className="headline">
            THE GRID<br />
            THAT<br />
            <span className="headline-accent">THINKS.</span>
          </h1>

          <p className="subline">
            Natural language queries on your data.<br />
            Zero server. Zero API keys. Zero latency.<br />
            LLM runs on the GPU inside your browser.
          </p>

          {/* Terminal */}
          <div className="terminal">
            <div className="terminal-bar">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">local-ghost — v1.0.0</span>
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
                      <span> {ROW_COUNTS[queryIndex]} rows matched </span>
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
              { value: '100%', label: 'On-Device Private' },
            ].map(({ value, label }) => (
              <div key={label} className="stat">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="ctas">
            <a href="https://github.com" className="btn btn-primary">VIEW SOURCE</a>
            <a href="#install" className="btn btn-secondary">GET STARTED →</a>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <div className="section-divider"><span>// FEATURES</span></div>
        <section className="features">
          {[
            {
              tag: '01',
              title: 'WEBGPU\nACCELERATION',
              desc: 'LLM inference runs directly on your GPU via the WebGPU API. Automatic WASM fallback for unsupported browsers. No CPU bottlenecks.',
              stat: '10× faster than CPU inference',
            },
            {
              tag: '02',
              title: 'WEB WORKER\nISOLATION',
              desc: 'All model inference runs in a dedicated Web Worker thread. The main thread stays at 60fps while the AI processes your query.',
              stat: '0ms UI thread blocking',
            },
            {
              tag: '03',
              title: 'BROWSER\nCACHE PERSIST',
              desc: 'Model weights download once and are stored via CacheStorage. Every subsequent load is instant — no re-download, ever.',
              stat: 'instant on every revisit',
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

        {/* ── INSTALL ── */}
        <div className="section-divider"><span>// INSTALL</span></div>
        <section id="install" className="code-section">
          <div className="code-block">
            <div className="code-label">NPM</div>
            <pre>
              <code>
                <span className="c-muted">$</span>
                {' npm install '}
                <span className="c-green">local-ghost</span>
                {'\n'}
                <span className="c-muted">#</span>
                {' peer deps: react ^18, recharts ^2'}
              </code>
            </pre>
          </div>

          <div className="code-block">
            <div className="code-label">QUICK START</div>
            <pre>
              <code>
                {'import '}
                <span className="c-orange">{'{ WebGPUAIProvider, SmartDataGrid,'}</span>
                {'\n         '}
                <span className="c-orange">{'SmartForm, SmartAnalytics }'}</span>
                {'\n  from '}
                <span className="c-green">&apos;local-ghost&apos;</span>
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
                <span className="c-muted">{'/* natural language → chart */'}</span>
                {'\n      '}
                <span className="c-green">{'<SmartAnalytics data={myData} />'}</span>
                {'\n    '}
                <span className="c-green">{'</WebGPUAIProvider>'}</span>
                {'\n  );\n}'}
              </code>
            </pre>
          </div>
        </section>

        <footer>
          <div className="footer-inner">
            <span className="footer-logo">LOCAL GHOST_</span>
            <span>
              Built with{' '}
              <span className="c-green">@huggingface/transformers</span>
              {' '}+ WebGPU
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
