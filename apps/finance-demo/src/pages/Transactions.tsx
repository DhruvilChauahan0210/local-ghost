import { useState, useMemo, useRef, useCallback } from 'react';
import { useAppCtx } from '../context/AppContext';
import { useWebGPUAI, execSandbox } from '../hooks/useAI';
import { CATEGORY_COLORS, CATEGORIES, FORM_CATEGORIES } from '../data/transactions';
import type { Transaction } from '../data/transactions';

const curr = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

type SortKey = keyof Transaction;
type SortDir = 'asc' | 'desc';

const FORM_SCHEMA = JSON.stringify([
  { name: 'date',     label: 'Date',     type: 'date'   },
  { name: 'merchant', label: 'Merchant', type: 'text'   },
  { name: 'category', label: 'Category', type: 'select' },
  { name: 'amount',   label: 'Amount',   type: 'number' },
  { name: 'type',     label: 'Type',     type: 'select' },
]);

export default function Transactions() {
  const { transactions, addTransaction, schema } = useAppCtx();
  const ai = useWebGPUAI();

  // ── Search state ────────────────────────────────────────────────
  const [query, setQuery]       = useState('');
  const [searching, setSearching] = useState(false);
  const [aiRows, setAiRows]     = useState<Transaction[] | null>(null);
  const [aiError, setAiError]   = useState(false);

  // ── Category filter ─────────────────────────────────────────────
  const [catFilter, setCatFilter] = useState('All');

  // ── Sort ─────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Add panel ─────────────────────────────────────────────────────
  const [showAdd, setShowAdd]     = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing]     = useState(false);
  const [flashFields, setFlashFields] = useState<Set<string>>(new Set());
  const [formVals, setFormVals]   = useState({ date:'', merchant:'', category:'', amount:'', type:'expense' });
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Run AI query ─────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setAiRows(null); setAiError(false); return; }

    setSearching(true);
    setAiError(false);

    // If AI isn't ready yet, show graceful "warming up" state and
    // trigger init — once it's ready the user can retry
    if (ai.status === 'uninitialized' || ai.status === 'disposed') {
      ai.initAI();
    }

    if (ai.status !== 'ready') {
      setSearching(false);
      return;
    }

    try {
      const { code } = await ai.runQuery(schema, q);
      const result = execSandbox(code, transactions as unknown[]);
      setAiRows(result ? (result as Transaction[]) : transactions);
    } catch {
      setAiError(true);
      setAiRows(null);
    } finally {
      setSearching(false);
    }
  }, [ai, schema, transactions]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void runSearch(query);
  };

  const clearSearch = () => { setQuery(''); setAiRows(null); setAiError(false); };

  // ── Client-side sort + category filter applied to whatever rows ──
  const baseRows = aiRows ?? transactions;

  const displayRows = useMemo(() => {
    let rows = catFilter === 'All' ? baseRows : baseRows.filter(t => t.category === catFilter);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const dir = sortDir === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return rows;
  }, [baseRows, catFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span className="sort-arrow">↕</span>;
    return <span className={`sort-arrow active`}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Auto-fill from receipt/text ──────────────────────────────────
  const handleParse = async () => {
    if (!pasteText.trim()) return;
    if (ai.status === 'uninitialized' || ai.status === 'disposed') { ai.initAI(); return; }
    if (ai.status !== 'ready') return;

    setParsing(true);
    try {
      const extracted = await ai.extractJSON(FORM_SCHEMA, pasteText);
      const flashed = new Set<string>();
      const next = { ...formVals };

      for (const [k, v] of Object.entries(extracted)) {
        const val = String(v ?? '').trim();
        if (!val || val === 'null') continue;
        if (k in next) {
          (next as Record<string, string>)[k] = val;
          flashed.add(k);
        }
      }

      setFormVals(next);
      setFlashFields(flashed);
      setTimeout(() => setFlashFields(new Set()), 900);
      setPasteText('');
    } finally {
      setParsing(false);
    }
  };

  // ── Submit new transaction ───────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVals.merchant || !formVals.amount) return;
    setSubmitting(true);

    addTransaction({
      date:     formVals.date     || new Date().toISOString().split('T')[0],
      merchant: formVals.merchant,
      category: formVals.category || 'Other',
      amount:   parseFloat(formVals.amount) || 0,
      type:     (formVals.type as 'income' | 'expense') || 'expense',
    });

    setTimeout(() => {
      setFormVals({ date:'', merchant:'', category:'', amount:'', type:'expense' });
      setShowAdd(false);
      setSubmitting(false);
    }, 300);
  };

  const isFiltered = aiRows !== null || catFilter !== 'All';
  const aiNotReady = ai.status !== 'ready';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{transactions.length} transactions · Apr – May 2025</p>
        </div>
        <button className="btn-green" onClick={() => setShowAdd(p => !p)}>
          {showAdd ? '✕ Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {/* ── Add transaction panel ── */}
      {showAdd && (
        <div className="add-panel">
          <div className="add-panel-title">New Transaction</div>
          <div className="add-panel-sub">Paste any text to auto-fill, or fill the form directly.</div>

          {/* Receipt paste — no "AI" label, just feels like magic */}
          <div className="paste-area">
            <div className="paste-area-label">Quick fill from text</div>
            <textarea
              className="input"
              rows={2}
              placeholder='Paste a receipt, bank email, or message — e.g. "Amazon charged $67.99 on Apr 6"'
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
            <div className="paste-footer">
              <span className="paste-hint">Works with emails, receipts, SMS, screenshots text…</span>
              <button
                className={`parse-btn${parsing ? ' parsing' : ''}`}
                onClick={handleParse}
                disabled={!pasteText.trim() || parsing}
              >
                {parsing
                  ? <><span className="search-spinner" style={{ width:11,height:11,borderWidth:1.5 }} /> Parsing…</>
                  : <>✦ Fill fields</>
                }
              </button>
            </div>
          </div>

          {/* Manual form */}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {(
                [
                  { name: 'date',     label: 'Date',     type: 'date',   span: false },
                  { name: 'merchant', label: 'Merchant', type: 'text',   span: true  },
                ] as const
              ).map(f => (
                <div key={f.name} className="field" style={f.span ? { gridColumn: '1 / -1'} : {}}>
                  <label className="input-label">{f.label}</label>
                  <input
                    type={f.type}
                    className={`input${flashFields.has(f.name) ? ' flashed' : ''}`}
                    value={formVals[f.name]}
                    placeholder={f.name === 'merchant' ? 'e.g. Starbucks, Amazon' : ''}
                    onChange={e => setFormVals(p => ({ ...p, [f.name]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="field">
                <label className="input-label">Category</label>
                <select
                  className={`input${flashFields.has('category') ? ' flashed' : ''}`}
                  value={formVals.category}
                  onChange={e => setFormVals(p => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {FORM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="input-label">Amount (USD)</label>
                <input
                  type="number" step="0.01" min="0"
                  className={`input${flashFields.has('amount') ? ' flashed' : ''}`}
                  placeholder="0.00"
                  value={formVals.amount}
                  onChange={e => setFormVals(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="input-label">Type</label>
                <select
                  className={`input${flashFields.has('type') ? ' flashed' : ''}`}
                  value={formVals.type}
                  onChange={e => setFormVals(p => ({ ...p, type: e.target.value }))}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn-green" disabled={!formVals.merchant || !formVals.amount || submitting}>
                {submitting ? 'Adding…' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Smart search bar ── */}
      <div style={{ marginBottom: 12 }}>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="Search or ask anything — 'food over $50', 'sort by amount', 'show subscriptions'…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="search-right">
            {searching && <span className="search-spinner" />}
            {aiNotReady && !searching && query.trim() && (
              <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {ai.status === 'loading' ? 'AI warming up…' : 'Press ↵'}
              </span>
            )}
            {query && !searching && (
              <button className="search-clear" onClick={clearSearch} title="Clear">×</button>
            )}
          </div>
        </div>
        {/* Result count badge */}
        {isFiltered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className="filter-badge">
              {displayRows.length} result{displayRows.length !== 1 ? 's' : ''}
              <button
                style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', padding:'0 0 0 2px', lineHeight:1, fontWeight:700 }}
                onClick={clearSearch}
              >×</button>
            </span>
            {aiError && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Could not parse query — showing all results
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Category chips ── */}
      <div className="chips" style={{ marginBottom: 14 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip${catFilter === cat ? ' on' : ''}`}
            onClick={() => setCatFilter(cat)}
            style={catFilter === cat && cat !== 'All'
              ? { borderColor: `${CATEGORY_COLORS[cat]}66`, color: CATEGORY_COLORS[cat], background: `${CATEGORY_COLORS[cat]}14` }
              : {}}
          >
            {cat !== 'All' && <span className="chip-dot" style={{ background: CATEGORY_COLORS[cat] ?? '#64748b' }} />}
            {cat}
          </button>
        ))}
      </div>

      {/* ── Transaction table ── */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('date')}>Date {sortArrow('date')}</th>
              <th className="sortable" onClick={() => handleSort('merchant')}>Merchant {sortArrow('merchant')}</th>
              <th className="sortable" onClick={() => handleSort('category')}>Category {sortArrow('category')}</th>
              <th className="sortable" style={{ textAlign:'right' }} onClick={() => handleSort('amount')}>Amount {sortArrow('amount')}</th>
              <th style={{ textAlign:'center' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">No transactions match this query.</div>
                </td>
              </tr>
            ) : (
              displayRows.map(tx => (
                <tr key={tx.id}>
                  <td className="td-date">
                    {new Date(tx.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="td-merchant">{tx.merchant}</td>
                  <td>
                    <div className="td-cat">
                      <span className="chip-dot" style={{ background: CATEGORY_COLORS[tx.category] ?? '#64748b', width:7, height:7 }} />
                      <span className="td-cat-label">{tx.category}</span>
                    </div>
                  </td>
                  <td className={`td-amt ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '−'}{curr(tx.amount)}
                  </td>
                  <td className="td-type">
                    <span className={`type-pill ${tx.type}`}>{tx.type}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
