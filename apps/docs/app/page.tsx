export default function DocsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f1117',
        color: '#e2e8f0',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          borderBottom: '1px solid #1e2130',
          padding: '0 2rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          backgroundColor: '#0f1117',
          zIndex: 50,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}
        >
          SmartDataGrid
        </span>
        <a
          href="https://github.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #1e2130',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          GitHub
        </a>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '6rem 2rem 4rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#1a1d27',
            border: '1px solid #2a2d3a',
            borderRadius: '999px',
            padding: '0.3rem 0.9rem',
            fontSize: '0.75rem',
            color: '#818cf8',
            fontWeight: 500,
            marginBottom: '1.75rem',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              display: 'inline-block',
            }}
          />
          WebGPU + Transformers.js
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#f8fafc',
            marginBottom: '1.25rem',
          }}
        >
          SmartDataGrid
          <br />
          <span style={{ color: '#6366f1' }}>Browser-Native AI</span> Data Filtering
        </h1>

        <p
          style={{
            fontSize: '1.125rem',
            color: '#94a3b8',
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 2.5rem',
          }}
        >
          Query your data in plain English. The AI runs entirely in your browser
          — no server, no API keys, no usage fees.
        </p>

        {/* Tagline pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.625rem',
            marginBottom: '3rem',
          }}
        >
          {[
            { label: '0ms Server Latency', color: '#10b981' },
            { label: '$0 Infrastructure', color: '#6366f1' },
            { label: '100% On-Device Privacy', color: '#f59e0b' },
          ].map(({ label, color }) => (
            <span
              key={label}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                border: `1px solid ${color}40`,
                backgroundColor: `${color}10`,
                color,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="https://github.com"
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            View on GitHub
          </a>
          <a
            href="#install"
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              backgroundColor: '#1a1d27',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              border: '1px solid #2a2d3a',
            }}
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Feature cards */}
      <section
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '0 2rem 5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {[
          {
            icon: '⚡',
            title: 'WebGPU Acceleration',
            description:
              'Runs the LLM directly on your GPU via the WebGPU API. Falls back to WASM automatically when WebGPU is unavailable.',
          },
          {
            icon: '🔒',
            title: 'Web Worker Isolation',
            description:
              'All model inference happens in a dedicated Web Worker — the main thread stays responsive while the AI thinks.',
          },
          {
            icon: '📦',
            title: 'Zero Server Dependencies',
            description:
              'No backend, no cloud API, no API key required. The model is downloaded once and cached in the browser forever.',
          },
        ].map(({ icon, title, description }) => (
          <div
            key={title}
            style={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2a2d3a',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '1.75rem',
                marginBottom: '0.75rem',
                lineHeight: 1,
              }}
            >
              {icon}
            </div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#f8fafc',
                marginBottom: '0.5rem',
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
              {description}
            </p>
          </div>
        ))}
      </section>

      {/* Install / Usage */}
      <section
        id="install"
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '0 2rem 6rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Quick Start
        </h2>

        {/* Install */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            1. Install
          </p>
          <pre
            style={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2a2d3a',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              overflowX: 'auto',
              fontSize: '0.875rem',
              color: '#a5b4fc',
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            }}
          >
            {`npm install @webgpu-ui/smart-data-grid`}
          </pre>
        </div>

        {/* Usage */}
        <div>
          <p
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            2. Use it
          </p>
          <pre
            style={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2a2d3a',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              overflowX: 'auto',
              fontSize: '0.875rem',
              color: '#e2e8f0',
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: '#818cf8' }}>import</span>
            {` { SmartDataGrid, WebGPUAIProvider } `}
            <span style={{ color: '#818cf8' }}>from</span>
            {` `}
            <span style={{ color: '#34d399' }}>{`'@webgpu-ui/smart-data-grid'`}</span>
            {`;\n\n`}
            <span style={{ color: '#818cf8' }}>export default function</span>
            {` `}
            <span style={{ color: '#fbbf24' }}>App</span>
            {`() {\n`}
            {`  `}
            <span style={{ color: '#818cf8' }}>return</span>
            {` (\n`}
            {`    `}
            <span style={{ color: '#6ee7b7' }}>{`<WebGPUAIProvider>`}</span>
            {`\n`}
            {`      `}
            <span style={{ color: '#6ee7b7' }}>{`<SmartDataGrid data={myData} />`}</span>
            {`\n`}
            {`    `}
            <span style={{ color: '#6ee7b7' }}>{`</WebGPUAIProvider>`}</span>
            {`\n`}
            {`  );\n`}
            {`}`}
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1e2130',
          padding: '2rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#475569',
        }}
      >
        <p>
          SmartDataGrid is open source. Built with{' '}
          <span style={{ color: '#6366f1' }}>@huggingface/transformers</span> and WebGPU.
        </p>
      </footer>
    </main>
  );
}
