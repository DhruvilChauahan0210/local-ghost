import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { TRANSACTIONS } from '../data/transactions';
import type { Transaction } from '../data/transactions';

interface AppContextValue {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  records: Record<string, unknown>[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...t, id: prev.length + 1 }, ...prev]);
  };

  const records = useMemo(
    () => transactions as unknown as Record<string, unknown>[],
    [transactions]
  );

  return (
    <AppContext.Provider value={{ transactions, addTransaction, records }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
