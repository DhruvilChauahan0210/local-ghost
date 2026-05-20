# Twitter/X Launch Thread

---

**Tweet 1 (hook)**:

I built React components where the AI runs 100% in the browser.

No server. No API key. No data leaves the tab.

Here's how it works 🧵

---

**Tweet 2 (the problem)**:

Every "AI-powered UI" component I've seen has the same hidden cost:

❌ A backend server to proxy LLM calls
❌ An API key (+ a monthly bill that scales with users)
❌ Your users' data sent to a third party

For internal tools and privacy-sensitive apps, this is a dealbreaker.

---

**Tweet 3 (the solution)**:

WebGPU-UI runs a quantized LLM directly inside a Web Worker via the WebGPU API.

```
User types query
→ Web Worker (off main thread)
→ WebGPU inference
→ Result in milliseconds

$0 infra. 0ms server latency. 100% private.
```

Model weights (~300MB) download once, persist in CacheStorage. Every load after that is instant.

---

**Tweet 4 (the three components)**:

Three drop-in React components:

`<SmartDataGrid>` — type "show engineers over 30, sort by salary" → filtered table

`<SmartForm>` — paste an email or bio → AI extracts name, company, role, salary into your form fields

`<SmartAnalytics>` — type "average salary by department" → Recharts bar chart. Automatically decides chart vs. table.

---

**Tweet 5 (how it works technically)**:

Under the hood:

- Model: `Qwen2.5-Coder-0.5B-Instruct` via `@huggingface/transformers` (ONNX, WebGPU-accelerated)
- Inference thread: dedicated Web Worker so UI stays at 60fps
- Code generation: LLM outputs a JS filter/sort expression, sandboxed via `new Function()`
- Fallback chain: WebGPU → WASM → optional server API
- Cache: `CacheStorage` for zero re-downloads

Chrome 113+, Edge 113+, Safari 18+ get GPU acceleration. Firefox gets WASM fallback.

---

**Tweet 6 (call to action)**:

It's open source and on npm today.

```bash
npm install @local-ghost
```

GitHub: https://github.com/DhruvilChauahan0210/local-ghost

If you're building dashboards, internal tools, or data apps and want AI-powered UX without a backend — give it a try and let me know what you think.

RT if you know someone who'd find this useful 🙏
