import { plannerRequestSchema, plannerResponseSchema, agentActionSchema } from '@trip-polama/core';
import type { ChatMessage, Trip, ResearchSpot } from '@trip-polama/core';

/** Explicit online route: minimized trip context, no manager fallback on failure. */
export async function chatAsPlanner(messages: ChatMessage[], trip: Trip | null,
  endpoint = '/api/planner/chat', signal?: AbortSignal, spots: ResearchSpot[] = []) {
  const payload = plannerRequestSchema.parse({
    suggestedSpots: spots.map(({ id, name }) => ({ id, name })),
    messages: messages.slice(-12).map((message) => ({ role: message.role,
      content: message.content + (message.actions ? `\nProposal statuses: ${JSON.stringify(message.actions.map((action, index) => ({
        action: ['create_trip', 'update_trip', 'open_view'].includes(action.type) ? action : { type: action.type },
        status: message.actionStatuses?.[index] ?? 'pending',
      })))}` : ''),
    })),
    trip: trip ? { name: trip.name, destination: trip.destination, startDate: trip.startDate,
      endDate: trip.endDate, currency: trip.currency, members: trip.members,
      waypointNames: trip.waypoints.slice(0, 100).map((point) => point.name) } : null,
  });
  const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    let code: unknown;
    try { code = (await response.json() as { code?: unknown }).code; } catch { /* Non-JSON proxy failures use the generic message. */ }
    if (code === 'invalid_model_reply' || code === 'invalid_model_action') throw new Error('I couldn’t prepare a valid trip change. Nothing was changed. Please clarify your destination and trip details, then try again.');
    if (code === 'invalid_planning_context') throw new Error('Some saved trip details could not be used for planning. Review the trip details and try again.');
    if (response.status === 402) throw new Error('Online planning is temporarily unavailable due to a service usage limit. You can still manage your saved trips.');
    if (response.status === 403) throw new Error('Online planning is unavailable right now. Please try again later.');
    if (response.status === 429) throw new Error('Planner usage or concurrency limit reached. Retry later.');
    if (response.status === 503) throw new Error('Online planning is not available yet. Your conversation stays saved, and trip tools remain available.');
    throw new Error('The planner could not reply right now. Your conversation is saved; please try again.');
  }
  const result = plannerResponseSchema.parse(await response.json());
  const allowed = trip ? ['update_trip', 'open_view'] : ['create_trip'];
  for (const action of result.answer.actions) {
    agentActionSchema.parse(action);
    if (!allowed.includes(action.type)) throw new Error('Planner proposed a manager-only action. No changes were made.');
  }
  return result;
}
