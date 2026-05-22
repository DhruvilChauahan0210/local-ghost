import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'Local Ghost — Ask Your Data Anything';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Fetch a Google Font as raw TTF bytes for Satori.
// Satori only supports TTF/OTF — NOT woff2.
// Using an old Safari UA makes Google Fonts serve TTF instead of woff2.
async function loadGoogleFont(family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`,
      {
        headers: {
          // Old Safari → Google Fonts responds with format('truetype') TTF files
          'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
        },
      }
    ).then(r => r.text());

    // Take the last @font-face block (latin subset) — match truetype, not woff2
    const matches = [...css.matchAll(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/g)];
    const url = matches[matches.length - 1]?.[1];
    if (!url) return null;

    return fetch(url).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OgImage() {
  // Load both fonts in parallel — the image renders even if either fails
  const [bebasData, monoData] = await Promise.all([
    loadGoogleFont('Bebas Neue'),
    loadGoogleFont('JetBrains Mono'),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' }[] = [];
  if (bebasData) fonts.push({ name: 'Bebas Neue',     data: bebasData, weight: 400, style: 'normal' });
  if (monoData)  fonts.push({ name: 'JetBrains Mono', data: monoData,  weight: 400, style: 'normal' });

  const displayFont = bebasData ? 'Bebas Neue'     : 'monospace';
  const monoFont    = monoData  ? 'JetBrains Mono' : 'monospace';

  return new ImageResponse(
    (
      <div style={{
        display:         'flex',
        flexDirection:   'column',
        justifyContent:  'space-between',
        width:           '100%',
        height:          '100%',
        backgroundColor: '#020402',
        padding:         '48px 60px 52px',
      }}>

        {/* ── Version badge ── */}
        <div style={{ display: 'flex' }}>
          <div style={{
            display:         'flex',
            border:          '1px solid #1a3a1a',
            padding:         '5px 14px',
            color:           '#00cc33',
            fontSize:         13,
            fontFamily:       monoFont,
            letterSpacing:   '0.12em',
            textTransform:   'uppercase',
          }}>
            V1.2.2 — MIT LICENSE — OPEN SOURCE
          </div>
        </div>

        {/* ── Headline ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily:    displayFont,
            fontSize:      152,
            lineHeight:    0.9,
            color:         '#e2f0e2',
            letterSpacing: '0.02em',
          }}>
            ASK YOUR
          </span>
          <span style={{
            fontFamily:    displayFont,
            fontSize:      152,
            lineHeight:    0.9,
            color:         '#e2f0e2',
            letterSpacing: '0.02em',
          }}>
            DATA
          </span>
          <span style={{
            fontFamily:    displayFont,
            fontSize:      152,
            lineHeight:    0.9,
            color:         '#00ff41',
            letterSpacing: '0.02em',
          }}>
            ANYTHING.
          </span>
        </div>

        {/* ── Subline ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: monoFont, fontSize: 15, color: '#6e9a6e', lineHeight: 1.9, letterSpacing: '0.02em' }}>
            Natural language queries. Charts. Stats. Rankings.
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 15, color: '#6e9a6e', lineHeight: 1.9, letterSpacing: '0.02em' }}>
            Zero server. Zero API keys. Zero latency.
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 15, color: '#6e9a6e', lineHeight: 1.9, letterSpacing: '0.02em' }}>
            Qwen2.5-Coder runs entirely on your GPU.
          </span>
        </div>

      </div>
    ),
    { ...size, fonts }
  );
}
