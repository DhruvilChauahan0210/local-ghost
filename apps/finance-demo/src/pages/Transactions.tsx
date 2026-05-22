import { useState, useMemo } from 'react';
import { SmartDataGrid, SmartForm } from '@dhruvil0210/local-ghost';
import type { SmartFormField } from '@dhruvil0210/local-ghost';
import { useApp } from '../context/AppContext';
import { CATEGORY_COLORS } from '../data/transactions';

const CATEGORIES = ['All', 'Income', 'Groceries', 'Food & Dining', 'Transport', 'Shopping', 'Subscriptions', 'Rent', 'Utilities', 'Healthcare', 'Travel', 'Other'];

const FORM_FIELDS: SmartFormField[] = [
  { name: 'date',     label: 'Date',             type: 'date' },
  { name: 'merchant', label: 'Merchant / Payee', type: 'text',   placeholder: 'e.g. Starbucks, Amazon' },
  { name: 'category', label: 'Category',         type: 'select', options: ['Groceries','Food & Dining','Transport','Shopping','Entertainment','Healthcare','Health & Fitness','Utilities','Subscriptions','Travel','Rent','Income','Other'] },
  { name: 'amount',   label: 'Amount (USD)',      type: 'number', placeholder: '0.00' },
  { name: 'type',     label: 'Type',              type: 'select', options: ['expense','income'] },
];

export default function Transactions() {
  const { transactions, addTransaction, records } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSuccess, setAddSuccess]     = useState(false);

  const filteredRecords = useMemo(() => {
    if (activeCategory === 'All') return records;
    return (transactions.filter(t => t.category === activeCategory)) as unknown as Record<string, unknown>[];
  }, [transactions, records, activeCategory]);

  const handleSubmit = (values: Record<string, string>) => {
    addTransaction({
      date:     values.date     || new Date().toISOString().split('T')[0],
      merchant: values.merchant || 'Unknown',
      category: values.category || 'Other',
      amount:   parseFloat(values.amount) || 0,
      type:     (values.type as 'income' | 'expense') || 'expense',
    });
    setAddSuccess(true);
    setTimeout(() => { setShowAddPanel(false); setAddSuccess(false); }, 1200);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{transactions.length} transactions · Apr – May 2025</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddPanel(p => !p)}>
          {showAddPanel ? '✕ Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {/* Add Transaction Panel — SmartForm embedded as a real product feature */}
      {showAddPanel && (
        <div className="add-panel">
          <div className="add-panel-header">
            <div>
              <div className="add-panel-title">Add Transaction</div>
              <div className="add-panel-sub">Paste a receipt or bank message to auto-fill, or fill manually below.</div>
            </div>
            <div className="ai-feature-badge">
              <span className="ai-dot" />
              AI Auto-fill
            </div>
          </div>
          {addSuccess ? (
            <div className="success-msg">✓ Transaction added successfully</div>
          ) : (
            <SmartForm fields={FORM_FIELDS} onSubmit={handleSubmit} />
          )}
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="chips-row">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={activeCategory === cat && cat !== 'All' ? { borderColor: `${CATEGORY_COLORS[cat]}66`, color: CATEGORY_COLORS[cat], background: `${CATEGORY_COLORS[cat]}15` } : {}}
          >
            {cat !== 'All' && <span className="chip-dot" style={{ background: CATEGORY_COLORS[cat] ?? '#64748b' }} />}
            {cat}
            {cat !== 'All' && (
              <span className="chip-count">
                {transactions.filter(t => t.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* AI Query Hint */}
      <div className="ai-hint-bar">
        <span className="ai-hint-icon">✦</span>
        <span className="ai-hint-text">AI-powered search: type naturally — <em>"show expenses over $50"</em>, <em>"sort by amount"</em>, <em>"filter groceries"</em></span>
      </div>

      {/* SmartDataGrid — the natural language search IS the table */}
      <SmartDataGrid data={filteredRecords} />
    </div>
  );
}
