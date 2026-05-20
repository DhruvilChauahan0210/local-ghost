# Show HN: I built AI-powered React components that run entirely in your browser

**Title**: Show HN: WebGPU-UI – React components with a local LLM (no server, no API key)

---

Every AI-powered UI component I've seen requires a backend to proxy LLM calls, an API key, and your users' data leaving their browser. I wanted to build something different: drop-in React components where the AI inference happens entirely on the client GPU. No server. No keys. No data exfiltration.

The approach: I'm using `@huggingface/transformers` (a WebGPU-accelerated ONNX runtime for the browser) to load a quantized `Qwen2.5-Coder-0.5B-Instruct` model (~300MB) directly into a Web Worker. The Web Worker keeps inference off the main thread so the UI stays at 60fps. Model weights download once and persist via the browser's `CacheStorage` API — subsequent loads are instant. For browsers without WebGPU (Firefox, older Safari), it automatically falls back to WASM.

I built three components on top of this infrastructure: `<SmartDataGrid>` takes a natural language query like "show engineers older than 30, sorted by salary" and generates a JavaScript filter/sort function via structured prompting, then evals it in a sandboxed `new Function()` call. `<SmartForm>` accepts pasted unstructured text (an email, a LinkedIn profile, a business card) and extracts a JSON object matching your field schema. `<SmartAnalytics>` takes a natural language prompt and decides whether to render a Recharts bar/line/pie chart or a filtered table — it returns a config object the component renders.

The repo is a Turborepo monorepo: the npm package lives in `packages/smart-data-grid`, a Vite demo app is at `apps/demo`, and a Next.js docs site is at `apps/docs`. The live demo is at `http://localhost:5173` if you clone and run it. I'd love feedback on the structured prompting approach for code generation — right now the LLM outputs raw JS and I sandbox-eval it, which works well but there's definitely room to make the prompts more robust. Also curious whether anyone has ideas on reducing the 300MB first-load weight (I've looked at smaller models but quality drops off sharply below 0.5B for code generation tasks).

GitHub: https://github.com/DhruvilChauahan0210/local-ghost  
npm: `npm install @local-ghost`
