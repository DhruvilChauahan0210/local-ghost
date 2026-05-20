# Local Ghost — Browser-Native AI Components

> Natural language data filtering, form auto-fill, and chart generation.  
> Zero server. Zero API keys. Runs entirely on your GPU.

[![npm version](https://img.shields.io/npm/v/local-ghost)](https://www.npmjs.com/package/local-ghost)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![WebGPU](https://img.shields.io/badge/WebGPU-enabled-orange)](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)

---

## The Problem

Every AI-powered UI component today requires:
- A backend server to proxy LLM calls
- An API key (and a monthly bill)
- Your users' data leaving their browser

## The Solution

**Local Ghost** runs a quantized LLM directly in the browser via WebGPU. No server. No API key. No data leaves the device.

```
User types query → WebGPU LLM → Filtered results
              0ms server latency | $0 infrastructure | 100% private
```

---

## Components

### `<SmartDataGrid />`
Natural language queries on tabular data.
```tsx
<SmartDataGrid data={myData} />
// "show only engineers older than 30, sorted by salary" → filtered table
```

### `<SmartForm />`
Auto-fills forms from pasted unstructured text.
```tsx
<SmartForm fields={formFields} onSubmit={handleSubmit} />
// Paste an email → AI extracts name, email, company, role, salary
```

### `<SmartAnalytics />`
Natural language to Recharts visualizations.
```tsx
<SmartAnalytics data={myData} />
// "average salary by role" → bar chart
// "employees earning over 100k" → filtered table
```

---

## Installation

```bash
npm install local-ghost
```

Peer dependencies: `react ^18`, `recharts ^2`

---

## Quick Start

```tsx
import { WebGPUAIProvider, SmartDataGrid } from 'local-ghost';

export default function App() {
  return (
    <WebGPUAIProvider>
      <SmartDataGrid data={myData} />
    </WebGPUAIProvider>
  );
}
```

---

## How It Works

```
Browser Tab
├── WebGPUAIProvider  ← initializes model pipeline
│   └── Web Worker   ← inference runs off main thread (no UI jank)
│       └── WebGPU   ← GPU acceleration (falls back to WASM)
└── Components
    ├── SmartDataGrid  ← AI generates JS filter/sort code
    ├── SmartForm      ← AI extracts JSON from unstructured text
    └── SmartAnalytics ← AI decides chart vs filter + parameters
```

**Model**: `onnx-community/Qwen2.5-Coder-0.5B-Instruct` (~300MB, cached after first load)  
**Fallback chain**: WebGPU → WASM → optional server API

---

## Browser Support

| Browser | WebGPU | WASM Fallback |
|---------|--------|---------------|
| Chrome 113+ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ |
| Firefox | ❌ | ✅ |
| Safari 18+ | ✅ | ✅ |

---

## Monorepo Structure

```
/
├── packages/smart-data-grid/   ← npm package (local-ghost)
├── apps/demo/                  ← live demo (Vite)
└── apps/docs/                  ← documentation (Next.js)
```

---

## License

MIT © 2026 — Local Ghost
