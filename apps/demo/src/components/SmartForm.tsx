import { useState, useCallback } from 'react';
import { useWebGPUAI } from '../hooks/useWebGPUAI';
import { AIStatusBadge } from './AIStatusBadge';

export interface SmartFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface SmartFormProps {
  fields: SmartFormField[];
  onSubmit?: (values: Record<string, string>) => void;
  className?: string;
}

type ExtractStatus = 'idle' | 'running' | 'done' | 'error';

// No rule-based extraction — AI decides everything or it fails honestly.

// ─── Component ────────────────────────────────────────────────────────────────
export function SmartForm({ fields, onSubmit, className = '' }: SmartFormProps) {
  const ai = useWebGPUAI();
  const [pastedText, setPastedText] = useState('');
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  );
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>('idle');
  const [extractError, setExtractError] = useState<string | null>(null);

  const applyExtracted = useCallback((extracted: Record<string, string>) => {
    setValues(prev => {
      const next = { ...prev };
      for (const field of fields) {
        const val = extracted[field.name];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          next[field.name] = String(val);
        }
      }
      return next;
    });
  }, [fields]);

  const handleAutoFill = useCallback(async () => {
    if (!pastedText.trim() || ai.status !== 'ready') return;

    setExtractStatus('running');
    setExtractError(null);

    try {
      const schema = JSON.stringify(fields.map(f => ({ name: f.name, label: f.label, type: f.type })));
      const userInput = `Extract the following fields from the text below. Return only a JSON object with keys matching the field names.\n\nText: """${pastedText}"""`;
      const extracted = await ai.extractJSON(schema, userInput);
      const hasValues = Object.values(extracted).some(v => v !== '' && v !== null && v !== undefined);
      if (hasValues) {
        applyExtracted(extracted);
        setExtractStatus('done');
      } else {
        setExtractError('AI could not find matching fields in this text. Try pasting something that clearly mentions a name, email, company, role, or salary.');
        setExtractStatus('error');
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'AI extraction failed. Try rephrasing the text.');
      setExtractStatus('error');
    }
  }, [ai, fields, pastedText, applyExtracted]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(values);
  }, [onSubmit, values]);

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z"/></svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">AI Smart Form</span>
          </div>
          <AIStatusBadge status={ai.status} progress={ai.progress} error={ai.error} mode={ai.mode} systemLogs={ai.systemLogs} />
        </div>

        {(ai.status === 'uninitialized' || ai.status === 'disposed') && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable Local AI</p>
              <p className="text-xs text-slate-500 mt-0.5">Enhances extraction accuracy. Works without AI too.</p>
            </div>
            <button onClick={ai.initAI} className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95">
              Enable AI
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="smart-form-paste" className="block text-xs font-medium text-slate-400">
            Paste any text — email, message, bio, notes
          </label>
          <textarea
            id="smart-form-paste"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Hi, I'm Jane Smith from Acme Corp. I'm a Senior Engineer at $140,000/year. Reach me at jane@acme.com"
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
          <button
            onClick={() => void handleAutoFill()}
            disabled={extractStatus === 'running' || !pastedText.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {extractStatus === 'running' ? (
              <><svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Extracting…</span></>
            ) : (
              <span>Auto-fill from Text</span>
            )}
          </button>
        </div>

        {extractStatus === 'done' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
            <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
            <span>Fields extracted. Review and edit before submitting.</span>
          </div>
        )}
        {extractStatus === 'error' && extractError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            <span>{extractError}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-4 shadow-xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(field => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={`sf-${field.name}`} className="text-xs font-medium text-slate-400">{field.label}</label>
              {field.type === 'select' && field.options ? (
                <select
                  id={`sf-${field.name}`}
                  value={values[field.name] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [field.name]: e.target.value }))}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>{field.placeholder ?? 'Select…'}</option>
                  {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  id={`sf-${field.name}`}
                  type={field.type}
                  value={values[field.name] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [field.name]: e.target.value }))}
                  placeholder={field.placeholder ?? field.label}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => { setValues(Object.fromEntries(fields.map(f => [f.name, '']))); setExtractStatus('idle'); setPastedText(''); }} className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700">Clear</button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500">Submit</button>
        </div>
      </form>
    </div>
  );
}
