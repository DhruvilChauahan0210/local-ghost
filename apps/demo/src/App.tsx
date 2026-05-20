import { useState } from 'react';
import { SmartDataGrid } from './components/SmartDataGrid';
import { SmartForm } from './components/SmartForm';
import { SmartAnalytics } from './components/SmartAnalytics';
import type { SmartFormField } from './components/SmartForm';

interface UserRecord {
  id: number;
  name: string;
  age: number;
  city: string;
  role: string;
  salary: number;
}

const SAMPLE_USERS: UserRecord[] = [
  { id: 1, name: 'Alice Mercer', age: 34, city: 'San Francisco', role: 'Engineer', salary: 145000 },
  { id: 2, name: 'Bob Tanaka', age: 27, city: 'New York', role: 'Designer', salary: 98000 },
  { id: 3, name: 'Carol Vance', age: 41, city: 'Austin', role: 'Manager', salary: 172000 },
  { id: 4, name: 'David Osei', age: 29, city: 'Seattle', role: 'Engineer', salary: 138000 },
  { id: 5, name: 'Eva Rossi', age: 36, city: 'Chicago', role: 'Analyst', salary: 115000 },
  { id: 6, name: 'Frank Liu', age: 23, city: 'Los Angeles', role: 'Intern', salary: 52000 },
  { id: 7, name: 'Grace Kim', age: 45, city: 'Boston', role: 'Director', salary: 210000 },
  { id: 8, name: 'Henry Park', age: 31, city: 'Denver', role: 'Engineer', salary: 129000 },
  { id: 9, name: 'Isla Nguyen', age: 38, city: 'Miami', role: 'Designer', salary: 107000 },
  { id: 10, name: 'James Carter', age: 52, city: 'Atlanta', role: 'VP', salary: 285000 },
  { id: 11, name: 'Kayla Brown', age: 26, city: 'Portland', role: 'Analyst', salary: 91000 },
  { id: 12, name: 'Liam Patel', age: 33, city: 'San Diego', role: 'Engineer', salary: 142000 },
  { id: 13, name: 'Mia Torres', age: 40, city: 'Phoenix', role: 'Manager', salary: 165000 },
  { id: 14, name: 'Noah Gonzalez', age: 22, city: 'San Jose', role: 'Intern', salary: 48000 },
  { id: 15, name: 'Olivia Chen', age: 37, city: 'San Francisco', role: 'Architect', salary: 198000 },
  { id: 16, name: 'Pedro Silva', age: 44, city: 'Houston', role: 'Director', salary: 225000 },
  { id: 17, name: 'Quinn Walker', age: 28, city: 'New York', role: 'Engineer', salary: 133000 },
  { id: 18, name: 'Rachel Adams', age: 35, city: 'Austin', role: 'Designer', salary: 112000 },
  { id: 19, name: 'Sam Wilson', age: 49, city: 'Chicago', role: 'VP', salary: 260000 },
  { id: 20, name: 'Tina Zhang', age: 30, city: 'Seattle', role: 'Analyst', salary: 104000 },
];

const SMART_FORM_FIELDS: SmartFormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Alice Mercer' },
  { name: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. alice@acme.com' },
  { name: 'company', label: 'Company', type: 'text', placeholder: 'e.g. Acme Corp' },
  { name: 'role', label: 'Role', type: 'select', options: ['Engineer', 'Designer', 'Manager', 'Analyst', 'Director', 'VP', 'Intern', 'Architect', 'Other'] },
  { name: 'salary', label: 'Annual Salary (USD)', type: 'number', placeholder: 'e.g. 120000' },
];

const EXAMPLE_PASTE_TEXT = `Hi, I'm Sarah Johnson from TechCorp. I'm a Senior Software Engineer with 8 years of experience.
You can reach me at sarah.johnson@techcorp.com. My current salary is $162,000 per year.
I'm interested in the Engineering Manager role you posted.`;

type Tab = 'grid' | 'form' | 'analytics';

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'grid', label: 'Smart Grid', description: 'Natural language data queries' },
  { id: 'form', label: 'Smart Form', description: 'AI-powered form auto-fill' },
  { id: 'analytics', label: 'Smart Analytics', description: 'Natural language chart generation' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('grid');
  const [submittedValues, setSubmittedValues] = useState<Record<string, string> | null>(null);

  return (
    <div className="min-h-screen bg-[#0f1117] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <svg
                className="h-5 w-5 text-indigo-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.560-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.586z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.25-14.083c.06.055.113.112.165.17a2.47 2.47 0 01.18 2.558L11.4 8.25h1.85a.75.75 0 01.6 1.2l-4.5 6a.75.75 0 01-.6.3h-1.5a.75.75 0 010-1.5h.705l-.6.8H5.25a.75.75 0 010-1.5h2.1l1.2-1.6H7.2a.75.75 0 01-.6-1.2L10.5 6H8.65a.75.75 0 01-.6-1.2L10.75 1.5a.75.75 0 011.5 2.417z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                WebGPU AI Component Library
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Phase 3 &mdash; SmartGrid, SmartForm &amp; SmartAnalytics &mdash; zero server round-trips
              </p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="mb-6 flex gap-1 rounded-xl border border-slate-700/60 bg-[#1a1d27] p-1" aria-label="Component tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
              ].join(' ')}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="block">{tab.label}</span>
              <span className={['block text-xs mt-0.5 font-normal', activeTab === tab.id ? 'text-indigo-200' : 'text-slate-600'].join(' ')}>
                {tab.description}
              </span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        {activeTab === 'grid' && (
          <section aria-label="Smart Data Grid">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                'show only users older than 30, sorted by name',
                'filter engineers earning over 130000',
                'show top 5 highest salaries',
                'users in San Francisco or New York',
              ].map((example) => (
                <span
                  key={example}
                  className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-400"
                >
                  &ldquo;{example}&rdquo;
                </span>
              ))}
            </div>
            <SmartDataGrid data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
          </section>
        )}

        {activeTab === 'form' && (
          <section aria-label="Smart Form">
            <div className="mb-4 rounded-lg border border-slate-700/40 bg-slate-800/30 px-4 py-3">
              <p className="text-xs font-medium text-slate-400 mb-1">Example text to paste:</p>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">{EXAMPLE_PASTE_TEXT}</p>
            </div>
            <SmartForm
              fields={SMART_FORM_FIELDS}
              onSubmit={(values) => setSubmittedValues(values)}
            />
            {submittedValues && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-300">Form Submitted</span>
                </div>
                <pre className="text-xs text-emerald-200/70 overflow-auto">
                  {JSON.stringify(submittedValues, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <section aria-label="Smart Analytics">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                'show salary distribution by role',
                'average age per city',
                'count employees by role',
              ].map((example) => (
                <span
                  key={example}
                  className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-400"
                >
                  &ldquo;{example}&rdquo;
                </span>
              ))}
            </div>
            <SmartAnalytics data={SAMPLE_USERS as unknown as Record<string, unknown>[]} />
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-600">
          Phase 3 &mdash; Powered by{' '}
          <span className="text-slate-500">@huggingface/transformers v3</span>{' '}
          &middot; Model runs entirely in your browser &middot; WebGPU &rarr; WASM &rarr; Server fallback
        </footer>
      </div>
    </div>
  );
}
