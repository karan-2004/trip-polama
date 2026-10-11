import { summarizeExpenses, computeNetBalances, suggestTransfers } from './settle';
import type { Trip } from './types';
import type { AgentAction } from './chat';

/** Uses all saved records and deterministic arithmetic, never model arithmetic. */
export function readTripData(trip: Trip, action: Extract<AgentAction, { type: 'read_trip' }>): string {
  const query = action.query?.toLowerCase() || '';
  const matching = (text: string) => !query || text.toLowerCase().includes(query);
  const money = (amount: number) => `${trip.currency} ${amount.toFixed(2)}`;
  switch (action.section) {
    case 'summary': {
      const summary = summarizeExpenses(trip.expenses);
      return `${trip.name} — ${trip.destination}\nDates: ${trip.startDate || 'Not set'} to ${trip.endDate || 'Not set'}\nGroup: ${trip.members.join(', ') || 'No members yet'}\nExpenses: ${money(summary.total)} across ${summary.count} records\nStops: ${trip.waypoints.filter((point) => point.visited).length} visited, ${trip.waypoints.filter((point) => !point.visited).length} remaining\nPhotos: ${trip.photos.length}`;
    }
    case 'expenses': {
      const expenses = trip.expenses.filter((expense) => matching(`${expense.description} ${expense.paidBy} ${expense.category}`));
      const total = summarizeExpenses(trip.expenses).total;
      const lines = expenses.map((expense) => `${expense.description}: ${money(expense.amount)}, paid by ${expense.paidBy}, shared by ${expense.splitAmong.join(', ') || expense.paidBy}`);
      const balances = computeNetBalances(trip.expenses);
      const transfers = suggestTransfers(trip.expenses).map((transfer) => `${transfer.from} owes ${transfer.to} ${money(transfer.amount)}`);
      return [`Total saved expenses: ${money(total)}`, ...lines,
        ...Object.entries(balances).map(([member, balance]) => `${member}: ${balance >= 0 ? 'receives' : 'owes'} ${money(Math.abs(balance))}`),
        ...transfers].join('\n');
    }
    case 'waypoints': return trip.waypoints.filter((point) => matching(`${point.name} ${point.visited ? 'visited' : 'remaining'}`)).map((point) =>
      `${point.name}: ${point.visited ? 'visited' : 'remaining'}${point.note ? ` — ${point.note}` : ''}`).join('\n') || 'No matching stops.';
    case 'members': return trip.members.filter(matching).join(', ') || 'No matching members.';
    case 'photos': return `${trip.photos.length} saved photos. ${trip.photos.filter((photo) => photo.note && matching(photo.note)).map((photo) => photo.note).join('; ')}`;
    case 'check_ins': return trip.memberLocations.filter((point) => matching(`${point.name} ${point.note || ''}`)).map((point) =>
      `${point.name}: ${point.placeName || 'Saved check-in'} at ${new Date(point.ts).toISOString()}${point.note ? ` — ${point.note}` : ''}`).join('\n') || 'No matching check-ins.';
  }
}

/** Known short read commands avoid inference latency and never perform writes. */
export function quickTripRead(text: string): Extract<AgentAction, { type: 'read_trip' }> | null {
  const normalized = text.trim().toLowerCase().replace(/[?.!]$/, '');
  if (/^(summary|trip summary|summarize (my |the )?trip|show (my |the )?trip summary)$/.test(normalized)) return { type: 'read_trip', section: 'summary' };
  if (/^(expenses|show expenses|list expenses|who owes whom|expense summary)$/.test(normalized)) return { type: 'read_trip', section: 'expenses' };
  if (/^(members|list members|who is joining)$/.test(normalized)) return { type: 'read_trip', section: 'members' };
  if (/^(waypoints|list waypoints|show stops)$/.test(normalized)) return { type: 'read_trip', section: 'waypoints' };
  if (/^(remaining stops|unvisited stops)$/.test(normalized)) return { type: 'read_trip', section: 'waypoints', query: 'remaining' };
  if (/^(photos|photo count)$/.test(normalized)) return { type: 'read_trip', section: 'photos' };
  if (/^(check-ins|check ins|show check-ins)$/.test(normalized)) return { type: 'read_trip', section: 'check_ins' };
  return null;
}

/** Restrict clear retrieval requests to reads; ambiguous/mixed writes stay in the approval path. */
export function isRetrievalRequest(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\b(?:do not|don't|never)\s+(?:change|write|add|update|delete|create|record|save|remove)\b[^.!?]*/g, '');
  if (/\b(add|record|create|update|delete|remove|mark|save|check in)\b/.test(normalized)) return false;
  return /^\s*(?:please\s+|briefly\s+|quickly\s+|can you\s+|could you\s+|would you\s+)*(?:retrieve|show|list|find|what|who|where|when|how much|give|summarize|tell me)\b/.test(normalized)
    || /\bread_trip\b/.test(normalized);
}
