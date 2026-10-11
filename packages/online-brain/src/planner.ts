import type { Trip } from '@trailbrain/core';

export interface TripPlan {
  itinerary: string[];
  packing: string[];
  budgetTips: string[];
  source: 'open-model' | 'offline-fallback';
}

export interface PlannerConfig {
  provider?: 'ollama' | 'openai-compatible';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  ollamaHost?: string;
}

/** Deterministic offline plan — always works, no network, no model. */
export function fallbackPlan(trip: Trip): TripPlan {
  let days = 2;
  try {
    if (trip.startDate && trip.endDate && trip.startDate <= trip.endDate) {
      const start = new Date(trip.startDate).getTime();
      const end = new Date(trip.endDate).getTime();
      days = Math.max(1, Math.round((end - start) / 86_400_000) + 1);
    }
  } catch {
    // keep default days
  }

  const names = trip.waypoints.map((w) => w.name);
  const itinerary: string[] = [];
  for (let i = 0; i < days; i++) {
    if (i < names.length) {
      itinerary.push(`Day ${i + 1}: reach ${names[i]} and cover the surrounding trails early.`);
    } else if (i === names.length) {
      itinerary.push(`Day ${i + 1}: explore ${trip.destination || 'the area'} and rest.`);
    } else {
      itinerary.push(`Day ${i + 1}: buffer day for weather or the return journey.`);
    }
  }

  return {
    itinerary,
    packing: [
      'layered clothing (mountain weather swings fast)',
      'rain shell and a pack cover',
      '1L+ water per person + purification tablets',
      'headlamp with spare batteries',
      'offline map + paper map backup',
      'first-aid kit and blister tape',
      'power bank and charging cable',
      'high-energy snacks (trail mix, energy bars)',
    ],
    budgetTips: [
      `keep a shared expense pool in ${trip.currency || 'INR'} and settle at the end`,
      'book only the first night; keep the rest flexible',
      'carry cash — cards do not work up the hill',
    ],
    source: 'offline-fallback',
  };
}

function buildPrompt(trip: Trip, preferences: string): { system: string; prompt: string } {
  const summary = {
    destination: trip.destination,
    start: trip.startDate,
    end: trip.endDate,
    currency: trip.currency,
    members: trip.members,
    waypoints: trip.waypoints.map((w) => w.name),
    preferences,
  };
  return {
    system:
      'You are an experienced outdoor trip planner. Reply with valid JSON only, with keys: ' +
      'itinerary (list of strings, one per day), packing (list of strings), budget_tips (list of strings). ' +
      'Keep every string short and practical.',
    prompt: `Plan an outdoor trip. Trip: ${JSON.stringify(summary)}. Make the plan get people off the screen and outdoors. Return only JSON.`,
  };
}

async function askOllama(prompt: string, system: string, host: string, model: string): Promise<string | null> {
  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, system, stream: false }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { response?: string };
  return data.response ?? null;
}

async function askOpenAiCompatible(
  prompt: string,
  system: string,
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<string | null> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

function parsePlan(raw: string): TripPlan | null {
  try {
    const cleaned = raw.replace(/```(?:json)?/g, '').trim();
    const data = JSON.parse(cleaned) as {
      itinerary?: string[];
      packing?: string[];
      budget_tips?: string[];
      budgetTips?: string[];
    };
    if (!Array.isArray(data.itinerary)) return null;
    return {
      itinerary: data.itinerary,
      packing: data.packing ?? [],
      budgetTips: data.budget_tips ?? data.budgetTips ?? [],
      source: 'open-model',
    };
  } catch {
    return null;
  }
}

/**
 * Plan a trip with an open-weight model, falling back to a deterministic plan
 * when no model is reachable.
 */
export async function planTrip(
  trip: Trip,
  preferences = '',
  config: PlannerConfig = {},
): Promise<TripPlan> {
  const { system, prompt } = buildPrompt(trip, preferences);
  try {
    if (config.provider === 'ollama' || (!config.baseUrl && config.ollamaHost)) {
      const raw = await askOllama(prompt, system, config.ollamaHost ?? 'http://localhost:11434', config.model ?? 'llama3.1');
      if (raw) return parsePlan(raw) ?? fallbackPlan(trip);
    }
    if (config.baseUrl && config.apiKey) {
      const raw = await askOpenAiCompatible(prompt, system, config.baseUrl, config.apiKey, config.model ?? 'llama3.1');
      if (raw) return parsePlan(raw) ?? fallbackPlan(trip);
    }
  } catch {
    // fall through to the offline plan
  }
  return fallbackPlan(trip);
}
