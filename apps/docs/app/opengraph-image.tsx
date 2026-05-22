import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'Local Ghost — AI React Components That Run in the Browser';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// NOTE: Satori (the renderer next/og uses) only supports a strict subset of CSS:
// - All layout must be flexbox (no grid, no absolute positioning with inset)
// - No multiple backgroundImage values
// - No overflow: hidden except on the outermost element
// - No box-shadow
// Keep everything flat and flex-based to avoid silent runtime crashes.

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#070b12',
          padding: '56px 64px',
          fontFamily: 'monospace',
        }}
      >
        {/* Top row — logo + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38, height: 38,
              backgroundColor: 'rgba(0,255,65,0.10)',
              border: '1px solid rgba(0,255,65,0.25)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: '#00ff41',
            }}>◈</div>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.06em' }}>
              LOCAL GHOST
            </span>
          </div>

          {/* Version badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(0,255,65,0.08)',
            border: '1px solid rgba(0,255,65,0.18)',
            borderRadius: 999,
            padding: '7px 18px',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#00ff41' }} />
            <span style={{ fontSize: 13, color: '#00ff41', fontWeight: 600, letterSpacing: '0.08em' }}>
              v1.2.2 · MIT · OPEN SOURCE
            </span>
          </div>
        </div>

        {/* Middle — headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, letterSpacing: '0.14em',
            color: '#22c55e', textTransform: 'uppercase',
          }}>
            npm install @dhruvil0210/local-ghost
          </div>
          <div style={{
            fontSize: 58, fontWeight: 800, lineHeight: 1.05,
            color: '#f1f5f9', letterSpacing: '-1.5px',
          }}>
            AI React components{'\n'}
            <span style={{ color: '#00ff41' }}>without the server.</span>
          </div>
          <div style={{
            fontSize: 21, color: '#64748b', lineHeight: 1.55, maxWidth: 700,
          }}>
            WebGPU-powered queries, form auto-fill, and chart generation — 100% in the browser. No API keys. No costs. No privacy tradeoff.
          </div>
        </div>

        {/* Bottom — stat pills */}
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { val: '0',    label: 'Servers'    },
            { val: '$0',   label: 'API Cost'   },
            { val: '100%', label: 'On-Device'  },
            { val: '3',    label: 'Components' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '14px 22px',
                minWidth: 100,
              }}
            >
              <span style={{
                fontSize: 30, fontWeight: 700, color: '#00ff41', letterSpacing: '-0.5px', lineHeight: 1,
              }}>{s.val}</span>
              <span style={{
                fontSize: 12, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
