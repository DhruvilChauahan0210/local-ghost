# Product Hunt Listing

**Name**: WebGPU-UI / SmartDataGrid

**Tagline**: AI-powered React components with zero server infrastructure

**Description**:

SmartDataGrid is an open-source React component library that brings natural language AI directly into your UI — with no backend, no API keys, and no data leaving the browser. Drop in `<SmartDataGrid>`, `<SmartForm>`, or `<SmartAnalytics>`, wrap with `<WebGPUAIProvider>`, and your users can query tables, auto-fill forms, and generate charts in plain English — all on their own GPU.

What makes it different: every other AI UI component on Product Hunt requires a server to proxy LLM calls. That means infrastructure cost, API key management, GDPR surface area, and latency. WebGPU-UI eliminates all of that. A quantized 0.5B-parameter model runs entirely inside a Web Worker via the WebGPU API, with automatic WASM fallback for Firefox. Model weights download once and persist in CacheStorage — $0/month, forever, for every user.

This is built for developers shipping internal tools, dashboards, and data apps who want AI-powered UX without adding a backend service. It's also genuinely useful for privacy-sensitive use cases: HR tools, financial dashboards, medical data viewers — anywhere you can't route user data through a third-party API.

---

**First comment** (founder post):

Hey PH! I'm Dhruvil, the builder behind WebGPU-UI.

The idea started when I was building an internal HR dashboard and wanted a "filter by natural language" feature. Every solution I found required either OpenAI's API (data leaves the org) or spinning up a self-hosted LLM server (operational overhead). I figured: browsers now have WebGPU, Hugging Face ships ONNX-quantized models that run in the browser, and Web Workers mean inference doesn't block the UI. Why not just... run the LLM in the tab?

Three weeks later, I had a proof of concept. Six weeks after that, I had a proper npm package with three components: `<SmartDataGrid>` for NL table queries, `<SmartForm>` for auto-filling forms from pasted text, and `<SmartAnalytics>` for turning natural language into Recharts visualizations.

The hardest part was prompt engineering for reliable code generation at 0.5B parameters. The model needs to output a single JavaScript expression — no markdown, no explanation — and I use a strict system prompt plus a sandboxed `new Function()` eval. Getting that prompt tight enough to work consistently across different query phrasings took most of the iteration time.

What's next: I want to add streaming token output so users see the AI "thinking", explore smaller/faster models as they improve, and build a server-fallback configuration for teams that want a cloud escape hatch. If you're using this in a project or have feedback on the prompting approach, I'd love to hear from you — reach out on GitHub or in the comments here.

GitHub: https://github.com/DhruvilChauahan0210/local-ghost
