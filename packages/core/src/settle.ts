import type { Expense } from './types';

const EPSILON = 0.001;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ExpenseSummary {
  total: number;
  count: number;
  /** Share each person owes (positive amount). */
  perPerson: Record<string, number>;
}

/** People an expense is split among; defaults to the payer when empty. */
function splitOf(e: Expense): string[] {
  return e.splitAmong.length ? e.splitAmong : [e.paidBy];
}

/** Total spend and each person's owed share. */
export function summarizeExpenses(expenses: Expense[]): ExpenseSummary {
  let total = 0;
  const perPerson: Record<string, number> = {};
  for (const e of expenses) {
    total += e.amount;
    const members = splitOf(e);
    const share = e.amount / members.length;
    for (const p of members) {
      perPerson[p] = (perPerson[p] ?? 0) + share;
    }
  }
  return { total, count: expenses.length, perPerson };
}

/**
 * Net balance per person: positive means they should receive money back,
 * negative means they owe money.
 */
export function computeNetBalances(expenses: Expense[]): Record<string, number> {
  const net: Record<string, number> = {};
  for (const e of expenses) {
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
    const members = splitOf(e);
    const share = e.amount / members.length;
    for (const p of members) {
      net[p] = (net[p] ?? 0) - share;
    }
  }
  return net;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** Greedy minimal-transaction settlement between debtors and creditors. */
export function suggestTransfers(expenses: Expense[]): Transfer[] {
  const net = computeNetBalances(expenses);
  const creditors = Object.entries(net)
    .filter(([, v]) => v > EPSILON)
    .sort((a, b) => b[1] - a[1]);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -EPSILON)
    .sort((a, b) => a[1] - b[1]);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]!;
    const debtor = debtors[j]!;
    const amount = Math.min(creditor[1], -debtor[1]);
    transfers.push({ from: debtor[0], to: creditor[0], amount: round2(amount) });
    creditor[1] -= amount;
    debtor[1] += amount;
    if (creditor[1] <= EPSILON) i++;
    if (debtor[1] >= -EPSILON) j++;
  }
  return transfers;
}
