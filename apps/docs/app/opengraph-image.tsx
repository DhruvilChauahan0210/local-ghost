import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'Local Ghost — AI React Components That Run in the Browser';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Satori rules (strictly enforced at runtime):
// 1. Every div/span with >1 child MUST have display:'flex' or display:'none'
// 2. No multiple backgroundImage values
// 3. No position:absolute + inset
// 4. No text node siblings next to element children in the same parent without flex

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', width:'100%', height:'100%', backgroundColor:'#070b12', padding:'56px 64px' }}>

        {/* ── Top: logo + badge ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38, backgroundColor:'rgba(0,255,65,0.10)', border:'1px solid rgba(0,255,65,0.25)', borderRadius:10, fontSize:20, color:'#00ff41' }}>
              ◈
            </div>
            <span style={{ fontSize:24, fontWeight:700, color:'#e2e8f0', letterSpacing:'0.06em', fontFamily:'monospace' }}>
              LOCAL GHOST
            </span>
          </div>

          {/* Badge */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', backgroundColor:'rgba(0,255,65,0.08)', border:'1px solid rgba(0,255,65,0.18)', borderRadius:999, padding:'7px 18px' }}>
            <div style={{ display:'flex', width:7, height:7, borderRadius:'50%', backgroundColor:'#00ff41' }} />
            <span style={{ fontSize:13, color:'#00ff41', fontWeight:600, letterSpacing:'0.08em', fontFamily:'monospace' }}>
              v1.2.2 · MIT · OPEN SOURCE
            </span>
          </div>

        </div>

        {/* ── Middle: headline ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          <span style={{ fontSize:13, fontWeight:600, letterSpacing:'0.14em', color:'#22c55e', textTransform:'uppercase', fontFamily:'monospace' }}>
            npm install @dhruvil0210/local-ghost
          </span>

          {/* Two-line headline — split into separate spans to avoid text+element siblings */}
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            <span style={{ fontSize:56, fontWeight:800, lineHeight:1.05, color:'#f1f5f9', letterSpacing:'-1.5px', fontFamily:'monospace' }}>
              AI React components
            </span>
            <span style={{ fontSize:56, fontWeight:800, lineHeight:1.05, color:'#00ff41', letterSpacing:'-1.5px', fontFamily:'monospace' }}>
              without the server.
            </span>
          </div>

          <span style={{ fontSize:20, color:'#64748b', lineHeight:1.55, maxWidth:'680px', fontFamily:'monospace' }}>
            WebGPU-powered queries, form auto-fill, and charts — 100% in the browser. No API keys. No costs.
          </span>

        </div>

        {/* ── Bottom: stat pills ── */}
        <div style={{ display:'flex', gap:'20px' }}>
          {(
            [
              { val:'0',    label:'SERVERS'    },
              { val:'$0',   label:'API COST'   },
              { val:'100%', label:'ON-DEVICE'  },
              { val:'3',    label:'COMPONENTS' },
            ] as const
          ).map(s => (
            <div key={s.label} style={{ display:'flex', flexDirection:'column', gap:'5px', backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'14px 24px', minWidth:'110px' }}>
              <span style={{ fontSize:30, fontWeight:700, color:'#00ff41', letterSpacing:'-0.5px', lineHeight:1, fontFamily:'monospace' }}>
                {s.val}
              </span>
              <span style={{ fontSize:11, color:'#475569', letterSpacing:'0.08em', fontFamily:'monospace' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    ),
    { ...size }
  );
}
