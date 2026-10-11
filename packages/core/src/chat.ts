import { z } from 'zod';

const name = z.string().trim().min(1).max(120);
const note = z.string().max(1000).optional();
const date = z.string().refine((value) => value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'Invalid date');
const currency = z.string().regex(/^[A-Z]{3}$/);
const members = z.array(name).max(30).refine((items) => new Set(items).size === items.length, 'Duplicate members');
export const manualViews = ['waypoints', 'expenses', 'suggest', 'people', 'photos'] as const;
export type ManualView = typeof manualViews[number];

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_trip'), name, destination: name, startDate: date,
    endDate: date, currency, members }).strict(),
  z.object({ type: z.literal('update_trip'), changes: z.object({
    name: name.optional(), destination: name.optional(), startDate: date.optional(),
    endDate: date.optional(), currency: currency.optional(),
  }).strict().refine((changes) => Object.keys(changes).length > 0, 'No changes') }).strict(),
  z.object({ type: z.literal('add_member'), name }).strict(),
  z.object({ type: z.literal('add_expense'), description: name, amount: z.number().finite().positive().max(100000000),
    category: name, paidBy: name, splitAmong: members.refine((items) => items.length > 0, 'Choose members') }).strict(),
  z.object({ type: z.literal('add_waypoint_here'), name, note, elevation: z.number().finite().optional() }).strict(),
  z.object({ type: z.literal('set_waypoint_visited'), waypointId: name, visited: z.boolean() }).strict(),
  z.object({ type: z.literal('check_in_here'), member: name, note }).strict(),
  z.object({ type: z.literal('suggest_next'), weather: z.enum(['clear', 'cloudy', 'rain', 'fog', 'snow']),
    daylightHours: z.number().finite().min(0).max(24), pace: z.enum(['slow', 'moderate', 'fast']) }).strict(),
  z.object({ type: z.literal('open_view'), view: z.enum(manualViews) }).strict(),
]);

export type AgentAction = z.infer<typeof agentActionSchema>;
export const chatReplySchema = z.object({
  reply: z.string().trim().min(1).max(12000),
  actions: z.array(agentActionSchema).max(5),
}).strict();
export type ChatReply = z.infer<typeof chatReplySchema>;
export const chatReplyJsonSchema = z.toJSONSchema(chatReplySchema);
export const plannerReplyJsonSchema = z.toJSONSchema(chatReplySchema.extend({
  actions: z.array(agentActionSchema.options[0]).max(1),
}));
export type ActionStatus = 'pending' | 'applied' | 'dismissed';

export interface ChatSession {
  id: string;
  tripId?: string;
  title: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  actions?: AgentAction[];
  actionStatuses?: ActionStatus[];
  source?: 'model' | 'local';
}

export function describeAction(action: AgentAction): string {
  switch (action.type) {
    case 'create_trip': return `Create ${action.name} in ${action.destination}`;
    case 'update_trip': return 'Update trip details';
    case 'add_member': return `Add ${action.name} to the group`;
    case 'add_expense': return `Record ${action.amount} for ${action.description}, paid by ${action.paidBy}`;
    case 'add_waypoint_here': return `Save ${action.name} at your current device location`;
    case 'set_waypoint_visited': return action.visited ? 'Mark stop visited' : 'Mark stop unvisited';
    case 'check_in_here': return `Check in ${action.member} at this device's current location (not a remote position)`;
    case 'suggest_next': return 'Calculate next stops from this device’s current location';
    case 'open_view': return `Open ${action.view === 'suggest' ? 'next-stop suggestions' : action.view}`;
  }
}
