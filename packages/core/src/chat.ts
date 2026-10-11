import { z } from 'zod';

const name = z.string().trim().min(1).max(120);
const note = z.string().max(1000).optional();
const date = z.string().refine((value) => value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'Invalid date');
const currency = z.string().regex(/^[A-Z]{3}$/);
const members = z.array(name).max(30).refine((items) => new Set(items).size === items.length, 'Duplicate members');
export const manualViews = ['waypoints', 'expenses', 'suggest', 'people', 'photos'] as const;
export type ManualView = typeof manualViews[number];
export const researchSpotSchema = z.object({ id: name, name, lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180), sourceUrl: z.string().url().refine((url) => url.startsWith('https://')),
  retrievedAt: z.string().datetime(), description: z.string().max(1000).optional() }).strict();
export type ResearchSpot = z.infer<typeof researchSpotSchema>;

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_trip'), name, destination: name, startDate: date,
    endDate: date, currency, members, spotIds: z.array(name).max(20).optional() }).strict(),
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
  z.object({ type: z.literal('read_trip'), section: z.enum(['summary', 'expenses', 'waypoints', 'members', 'photos', 'check_ins']),
    query: z.string().trim().max(120).optional() }).strict(),
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
export const managerReplySchema = chatReplySchema.extend({
  actions: z.array(z.discriminatedUnion('type', [agentActionSchema.options[1], agentActionSchema.options[2],
    agentActionSchema.options[3], agentActionSchema.options[4], agentActionSchema.options[5],
    agentActionSchema.options[6], agentActionSchema.options[7], agentActionSchema.options[8], agentActionSchema.options[9]])).max(1),
});
export const managerReplyJsonSchema = z.toJSONSchema(managerReplySchema);
export const retrievalReplySchema = chatReplySchema.extend({ actions: z.array(agentActionSchema.options[9]).length(1) });
export const retrievalReplyJsonSchema = z.toJSONSchema(retrievalReplySchema);
export const replanReplySchema = chatReplySchema.extend({
  actions: z.array(z.union([agentActionSchema.options[1], agentActionSchema.options[8]])).max(3),
});
export const replanReplyJsonSchema = z.toJSONSchema(replanReplySchema);
export type AgentRole = 'planner' | 'manager';
export interface ResearchSource { title: string; url: string; retrievedAt: string }
export const researchSourceSchema = z.object({ title: z.string().max(300),
  url: z.string().url().refine((url) => url.startsWith('https://'), 'HTTPS source required'),
  retrievedAt: z.string().datetime() }).strict();
export const plannerRequestSchema = z.object({
  suggestedSpots: z.array(z.object({ id: name, name }).strict()).max(20).optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(16000) }).strict()).min(1).max(12),
  trip: z.object({ name, destination: z.string().max(120), startDate: date, endDate: date,
    currency, members, waypointNames: z.array(name).max(100) }).strict().nullable(),
}).strict();
export type PlannerRequest = z.infer<typeof plannerRequestSchema>;
export const plannerResponseSchema = z.object({ answer: chatReplySchema,
  spots: z.array(researchSpotSchema).max(20).optional(),
  sources: z.array(researchSourceSchema).max(20), model: z.string().min(1).max(200) }).strict();
export type ActionStatus = 'pending' | 'applied' | 'dismissed';

export interface ChatSession {
  suggestedSpots?: ResearchSpot[];
  activeAgent?: AgentRole;
  id: string;
  tripId?: string;
  title: string;
  updatedAt: number;
}

export interface ChatMessage {
  spots?: ResearchSpot[];
  photoIds?: string[];
  agentRole?: AgentRole;
  model?: string;
  sources?: ResearchSource[];
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  actions?: AgentAction[];
  actionStatuses?: ActionStatus[];
  source?: 'model' | 'local';
}

export function sessionAgent(session: ChatSession): AgentRole {
  return session.tripId ? session.activeAgent ?? 'manager' : 'planner';
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
    case 'read_trip': return 'Read saved trip details';
  }
}

export function isReadOnlyAction(action: AgentAction): boolean {
  return ['read_trip', 'suggest_next', 'open_view'].includes(action.type);
}
