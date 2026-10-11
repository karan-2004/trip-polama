import { describe, it, expect } from 'vitest';
import { summarizeExpenses, computeNetBalances, suggestTransfers } from './settle';
import type { Expense } from './types';

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    description: 'lunch',
    amount: 100,
    category: 'food',
    paidBy: 'alice',
    splitAmong: ['alice', 'bob'],
    ts: 0,
    ...overrides,
  };
}

describe('summarizeExpenses', () => {
  it('splits evenly among listed members', () => {
    const s = summarizeExpenses([expense({ amount: 100, splitAmong: ['alice', 'bob'] })]);
    expect(s.total).toBe(100);
    expect(s.perPerson.alice).toBe(50);
    expect(s.perPerson.bob).toBe(50);
  });

  it('defaults to a one-way split when splitAmong is empty', () => {
    const s = summarizeExpenses([expense({ amount: 60, splitAmong: [] })]);
    expect(s.total).toBe(60);
    expect(s.perPerson.alice).toBe(60);
  });
});

describe('computeNetBalances', () => {
  it('owes the payer back when someone else pays', () => {
    const net = computeNetBalances([expense({ amount: 100, paidBy: 'alice', splitAmong: ['alice', 'bob'] })]);
    expect(net.alice).toBeCloseTo(50);
    expect(net.bob).toBeCloseTo(-50);
  });
});

describe('suggestTransfers', () => {
  it('settles a simple two-person split with one transfer', () => {
    const transfers = suggestTransfers([
      expense({ id: 'a', amount: 200, paidBy: 'alice', splitAmong: ['alice', 'bob'] }),
    ]);
    expect(transfers).toEqual([{ from: 'bob', to: 'alice', amount: 100 }]);
  });

  it('returns no transfers when everyone is square', () => {
    const transfers = suggestTransfers([
      expense({ id: 'a', amount: 100, paidBy: 'alice', splitAmong: ['alice', 'bob'] }),
      expense({ id: 'b', amount: 100, paidBy: 'bob', splitAmong: ['alice', 'bob'] }),
    ]);
    expect(transfers).toEqual([]);
  });
});
