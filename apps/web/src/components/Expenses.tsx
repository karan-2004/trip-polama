import { useState, type FormEvent } from 'react';
import type { Trip } from '@trip-polama/core';
import { summarizeExpenses, suggestTransfers } from '@trip-polama/core';
import { addExpense } from '@trip-polama/store';

const CATEGORIES = ['food', 'transport', 'stay', 'gear', 'permits', 'other'];

export function Expenses({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(trip.members[0] ?? '');
  const [split, setSplit] = useState<string[]>(trip.members);

  const members = trip.members.length ? trip.members : ['me'];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!description.trim() || !Number.isFinite(amt) || amt <= 0) return;
    await addExpense({
      tripId: trip.id,
      description: description.trim(),
      amount: amt,
      category,
      paidBy: paidBy || members[0]!,
      splitAmong: split.length ? split : [paidBy || members[0]!],
      ts: Date.now(),
    });
    setDescription('');
    setAmount('');
    onChanged();
  }

  function toggleSplit(m: string) {
    setSplit((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  const summary = summarizeExpenses(trip.expenses);
  const transfers = suggestTransfers(trip.expenses);
  const symbol = trip.currency || 'INR';

  return (
    <div>
      <div className="panel">
        <div className="grid">
          <div>
            <div className="muted">Total spent</div>
            <div className="amount" style={{ fontSize: '1.5rem' }}>
              {symbol} {summary.total.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="muted">Split across</div>
            {Object.entries(summary.perPerson).map(([p, v]) => (
              <div key={p} className="mono">
                {p}: {symbol} {v.toFixed(0)}
              </div>
            ))}
          </div>
        </div>

        {transfers.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="muted" style={{ marginBottom: '0.4rem' }}>
              Who owes whom
            </div>
            {transfers.map((t, i) => (
              <div key={i} className="mono">
                <span className="amount neg">{t.from}</span> →{' '}
                <span className="amount pos">{t.to}</span> {symbol} {t.amount.toFixed(0)}
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="panel" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guesthouse" required />
          </div>
          <div className="field">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200" required />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Split among</label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {members.map((m) => (
              <label key={m} className="chip" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={split.includes(m)}
                  onChange={() => toggleSplit(m)}
                  style={{ width: 'auto', marginRight: '0.3rem' }}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit">Add expense</button>
        </div>
      </form>

      {trip.expenses.length === 0 ? (
        <div className="empty">No expenses yet.</div>
      ) : (
        <ul className="list">
          {trip.expenses.map((e) => (
            <li key={e.id} className="list-item">
              <div>
                <div className="title">{e.description}</div>
                <div className="sub">
                  {e.category} · paid by {e.paidBy} · split {e.splitAmong.join(', ')}
                </div>
              </div>
              <div className="amount">{symbol} {e.amount.toFixed(0)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
