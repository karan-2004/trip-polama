import { useState } from 'react';
import { describeAction, isReadOnlyAction } from '@trip-polama/core';
import type { AgentAction, ResearchSpot, Trip, ActionStatus } from '@trip-polama/core';

export function ActionReview({ action, status, trip, spots, busy, onConfirm, onDismiss }: {
  action: AgentAction; status: ActionStatus; trip: Trip | null; spots: ResearchSpot[];
  busy: boolean; onConfirm: (selectedSpotIds?: string[]) => void; onDismiss: () => void;
}) {
  const [selected, setSelected] = useState(action.type === 'create_trip' ? action.spotIds ?? spots.map((spot) => spot.id) : []);
  const rows: [string, string][] = [];
  const labels: Record<string, string> = { name: 'Trip name', destination: 'Destination', startDate: 'Start date', endDate: 'End date', currency: 'Currency' };
  switch (action.type) {
    case 'create_trip': rows.push(['Trip name', action.name], ['Destination', action.destination],
      ['Dates', `${action.startDate || 'Not set'} to ${action.endDate || 'Not set'}`], ['Currency', action.currency],
      ['Members', action.members.join(', ') || 'Not set']); break;
    case 'update_trip': rows.push(...Object.entries(action.changes).map(([key, value]): [string, string] => [labels[key] || 'Detail', value || 'Not set'])); break;
    case 'add_member': rows.push(['Member', action.name]); break;
    case 'add_expense': rows.push(['Expense', action.description], ['Amount', `${trip?.currency || ''} ${action.amount.toFixed(2)}`],
      ['Paid by', action.paidBy], ['Shared by', action.splitAmong.join(', ')], ['Category', action.category]); break;
    case 'add_waypoint_here': rows.push(['Stop', action.name], ['Location', 'Your current device location']); if (action.note) rows.push(['Note', action.note]); break;
    case 'set_waypoint_visited': rows.push(['Stop', trip?.waypoints.find((point) => point.id === action.waypointId)?.name || 'Saved stop'], ['Status', action.visited ? 'Visited' : 'Not visited']); break;
    case 'check_in_here': rows.push(['Member', action.member], ['Location', 'This device’s current position']); if (action.note) rows.push(['Note', action.note]); break;
    default: break;
  }
  return <div className="action-card">
    <strong>{describeAction(action)}</strong>
    <dl className="action-review">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {action.type === 'create_trip' && !!spots.length && <fieldset className="spot-selection">
      <legend>Suggested stops to save with your trip</legend>
      {spots.map((spot) => <label key={spot.id}><input type="checkbox" checked={selected.includes(spot.id)} disabled={busy || status !== 'pending'}
        onChange={() => setSelected((ids) => ids.includes(spot.id) ? ids.filter((id) => id !== spot.id) : [...ids, spot.id])} />
        <span>{spot.name} <a href={spot.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></span></label>)}
      <p className="muted">Selected stops become saved waypoints. Uncheck any you do not want. Check access and trail conditions separately.</p>
    </fieldset>}
    {status === 'pending' ? <div className="row">
      <button type="button" disabled={busy} onClick={() => onConfirm(action.type === 'create_trip' ? selected : undefined)}>
        {isReadOnlyAction(action) ? 'Retry' : 'Confirm change'}</button>
      {!isReadOnlyAction(action) && <button type="button" className="ghost" disabled={busy} onClick={onDismiss}>Dismiss</button>}
    </div> : <span className="badge">{status === 'applied' ? 'Completed' : 'Dismissed'}</span>}
  </div>;
}
