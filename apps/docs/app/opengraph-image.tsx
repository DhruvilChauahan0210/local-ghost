import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt     = 'Local Ghost — AI React Components That Run in the Browser';
export const size    = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: '#070b12',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,255,65,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Green glow top-left */}
        <div style={{
          position: 'absolute', top: -120, left: -120,
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,255,65,0.08) 0%, transparent 70%)',
        }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 72px', flex: 1, position: 'relative', zIndex: 1 }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(0,255,65,0.12)',
                border: '1px solid rgba(0,255,65,0.3)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: '#00ff41',
              }}>◈</div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em' }}>LOCAL GHOST</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,255,65,0.08)',
              border: '1px solid rgba(0,255,65,0.2)',
              borderRadius: 999,
              padding: '6px 16px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff41' }} />
              <span style={{ fontSize: 13, color: '#00ff41', fontWeight: 600, letterSpacing: '0.08em' }}>v1.2.2 · MIT · OPEN SOURCE</span>
            </div>
          </div>

          {/* Main headline */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, color: '#4ade80', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
              npm install @dhruvil0210/local-ghost
            </div>
            <div style={{ fontSize: 62, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.0, letterSpacing: '-1px', marginBottom: 24 }}>
              AI React components<br />
              <span style={{ color: '#00ff41' }}>without the server.</span>
            </div>
            <div style={{ fontSize: 22, color: '#64748b', lineHeight: 1.5, maxWidth: 680 }}>
              WebGPU-powered natural language queries, form auto-fill, and charts —
              running 100% in the browser. No API keys. No costs.
            </div>
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
            {[
              { val: '0',    label: 'Servers'    },
              { val: '$0',   label: 'API Cost'   },
              { val: '100%', label: 'On-Device'  },
              { val: '3',    label: 'Components' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#00ff41', letterSpacing: '-0.5px' }}>{s.val}</span>
                <span style={{ fontSize: 13, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
