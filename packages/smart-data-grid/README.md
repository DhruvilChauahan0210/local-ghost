# @dhruvil0210/local-ghost

**Browser-native AI components for React.** Natural language filtering, form auto-fill, and chart generation — powered by WebGPU. Zero server. Zero API keys. Zero cost.

[![npm version](https://img.shields.io/npm/v/@dhruvil0210/local-ghost)](https://www.npmjs.com/package/@dhruvil0210/local-ghost)
[![license](https://img.shields.io/npm/l/@dhruvil0210/local-ghost)](https://github.com/DhruvilChauahan0210/local-ghost/blob/main/LICENSE)

---

## Why Local Ghost?

Most AI-powered UI components need a backend, an API key, and a cloud bill. Local Ghost runs the model entirely in your user's browser using WebGPU and [@huggingface/transformers](https://github.com/huggingface/transformers.js). The model downloads once (~300MB), caches in the browser forever, and never sends data to any server.

- **Private by default** — data never leaves the user's device
- **No API keys** — no OpenAI, no Anthropic, no nothing
- **No server costs** — scales to unlimited users for free
- **Works offline** — once the model is cached

---

## Components

| Component | What it does |
|---|---|
| `SmartDataGrid` | Table with a natural language filter bar powered by on-device AI |
| `SmartForm` | Form that auto-fills fields from plain English input |
| `SmartAnalytics` | Ask questions about your data and get charts or stats back |

---

## Requirements

- React 18+
- A browser with [WebGPU support](https://caniuse.com/webgpu) (Chrome 113+, Edge 113+)
- Node 18+ (build time only)

---

## Installation

```bash
npm install @dhruvil0210/local-ghost
```

Peer dependencies:

```bash
npm install react react-dom recharts
```

---

## Quick Start

Wrap your app (or any subtree) with `WebGPUAIProvider` once:

```tsx
import { WebGPUAIProvider } from '@dhruvil0210/local-ghost';

export default function App() {
  return (
    <WebGPUAIProvider>
      <YourApp />
    </WebGPUAIProvider>
  );
}
```

---

## SmartDataGrid

A data table with a built-in natural language query bar. Users can type things like _"show only users older than 30, sorted by name"_ and the on-device model generates and runs the filter code.

```tsx
import { SmartDataGrid } from '@dhruvil0210/local-ghost';

const employees = [
  { name: 'Alice', department: 'Engineering', salary: 120000, age: 31 },
  { name: 'Bob',   department: 'Design',      salary: 95000,  age: 27 },
  { name: 'Carol', department: 'Engineering', salary: 140000, age: 35 },
];

export function EmployeeTable() {
  return <SmartDataGrid data={employees} />;
}
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `data` | `Record<string, unknown>[]` | Array of row objects to display |

**How it works**

1. User clicks **Enable AI** — model downloads and caches in the browser (~300MB, one time)
2. User types a plain English query and hits **Run**
3. The on-device model generates a JS filter function
4. The function runs in a sandboxed environment and filters the rows
5. The table re-renders with the filtered results

---

## SmartForm

A form component that reads a plain English description and auto-fills matching fields using on-device AI.

```tsx
import { SmartForm } from '@dhruvil0210/local-ghost';
import type { SmartFormField } from '@dhruvil0210/local-ghost';

const fields: SmartFormField[] = [
  { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Jane' },
  { name: 'email',     label: 'Email',      type: 'email' },
  { name: 'role',      label: 'Role',       type: 'select', options: ['Engineer', 'Designer', 'Manager'] },
  { name: 'startDate', label: 'Start Date', type: 'date' },
];

export function OnboardingForm() {
  return (
    <SmartForm
      fields={fields}
      onSubmit={(values) => console.log(values)}
    />
  );
}
```

**Props**

| Prop | Type | Description |
|---|---|---|
| `fields` | `SmartFormField[]` | Form field definitions |
| `onSubmit` | `(values: Record<string, string>) => void` | Called when form is submitted |
| `className` | `string` | Optional wrapper class |

**SmartFormField**

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Field key |
| `label` | `string` | Display label |
| `type` | `'text' \| 'email' \| 'number' \| 'date' \| 'select'` | Input type |
| `options` | `string[]` | Options for `select` type |
| `placeholder` | `string` | Input placeholder |

---

## SmartAnalytics

Ask natural language questions about your data and get back charts, stats, or filtered tables — all generated and rendered on-device.

```tsx
import { SmartAnalytics } from '@dhruvil0210/local-ghost';

const sales = [
  { region: 'North', revenue: 420000, units: 1200 },
  { region: 'South', revenue: 310000, units: 890 },
  { region: 'East',  revenue: 560000, units: 1540 },
  { region: 'West',  revenue: 390000, units: 1050 },
];

export function SalesDashboard() {
  return <SmartAnalytics data={sales} />;
}
```

Example queries users can ask:
- _"Show a bar chart of revenue by region"_
- _"What is the total revenue?"_
- _"Which region has the highest units?"_
- _"Filter to regions with revenue above 400000"_

**Props**

| Prop | Type | Description |
|---|---|---|
| `data` | `Record<string, unknown>[]` | Dataset to analyse |
| `className` | `string` | Optional wrapper class |

---

## Hooks

### `useWebGPUAI`

Access the AI engine directly for custom use cases.

```tsx
import { useWebGPUAI } from '@dhruvil0210/local-ghost';

function MyComponent() {
  const ai = useWebGPUAI();

  return (
    <div>
      <p>Status: {ai.status}</p>
      {ai.status === 'loading' && <p>Loading model: {ai.progress}%</p>}
      <button onClick={ai.initAI} disabled={ai.status !== 'uninitialized'}>
        Load AI
      </button>
    </div>
  );
}
```

**Returns**

| Property | Type | Description |
|---|---|---|
| `status` | `'uninitialized' \| 'loading' \| 'ready' \| 'error' \| 'disposed'` | Current model state |
| `progress` | `number` | Download progress (0–100) |
| `error` | `string \| null` | Error message if status is `'error'` |
| `initAI` | `() => void` | Start model download and initialisation |
| `runQuery` | `(schema: string, query: string) => Promise<{ code: string }>` | Generate filter code for a natural language query |

### `useWebGPUAIContext`

Raw access to the provider context — useful for building your own components on top of the same AI engine.

```tsx
import { useWebGPUAIContext } from '@dhruvil0210/local-ghost';
```

---

## Browser Support

| Browser | WebGPU | Status |
|---|---|---|
| Chrome 113+ | ✅ | Fully supported |
| Edge 113+ | ✅ | Fully supported |
| Firefox | ❌ | Not yet (behind flag) |
| Safari | ⚠️ | Experimental (Safari 18+) |

Components degrade gracefully when WebGPU is unavailable — they display an "AI Unavailable" badge and remain usable as standard UI components without the AI features.

---

## Security

Generated code from the on-device model runs inside a sandboxed execution environment (`safelyExecuteGeneratedCode`). The sandbox validates code before execution and prevents access to browser APIs outside of the data transformation scope. You can import and use the sandbox independently:

```tsx
import { safelyExecuteGeneratedCode, verifyCodeSafety } from '@dhruvil0210/local-ghost';
```

---

## TypeScript

Full TypeScript support is included. All props, hooks, and utilities are fully typed.

---

## License

MIT © [Dhruvil Chauhan](https://github.com/DhruvilChauahan0210)
