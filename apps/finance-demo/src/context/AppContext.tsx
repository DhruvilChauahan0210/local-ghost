import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { TRANSACTIONS } from '../data/transactions';
import type { Transaction } from '../data/transactions';

interface AppCtx {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  schema: string;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);

  const schema = useMemo(
    () => Object.keys(TRANSACTIONS[0]).join(', '),
    []
  );

  const addTransaction = (t: Omit<Transaction, 'id'>) =>
    setTransactions(prev => [{ ...t, id: prev.length + 1 }, ...prev]);

  return <Ctx.Provider value={{ transactions, addTransaction, schema }}>{children}</Ctx.Provider>;
}

export const useAppCtx = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAppCtx outside AppProvider');
  return c;
};
