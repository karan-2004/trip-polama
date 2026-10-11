import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runOnlinePlanner } from './planner';

// Opt-in paid/cloud test; synthetic context only, never application data or writes.
describe.skipIf(process.env.RUN_LIVE_PLANNER !== '1')('live online planner', () => {
  let lastModelReply = '';
  beforeEach(() => {
    lastModelReply = '';
    const original = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (...args) => {
      const response = await original(...args);
      if (!response.ok) {
        let detail = await response.clone().text();
        for (const secret of [process.env.PLANNER_API_KEY, process.env.BRAVE_SEARCH_API_KEY]) {
          if (secret) detail = detail.split(secret).join('[redacted]');
        }
        console.info('Upstream status:', response.status, 'detail:', detail.slice(0, 1000));
      } else {
        const body = await response.clone().json() as { choices?: { message?: { content?: string } }[] };
        if (body.choices?.[0]?.message?.content) lastModelReply = body.choices[0].message.content;
      }
      return response;
    });
  });
  afterEach((context) => {
    if (context.task.result?.state === 'fail') {
      for (const secret of [process.env.PLANNER_API_KEY, process.env.BRAVE_SEARCH_API_KEY]) {
        if (secret) lastModelReply = lastModelReply.split(secret).join('[redacted]');
      }
      console.info('Rejected synthetic model reply:', lastModelReply.slice(0, 2000));
    }
    vi.restoreAllMocks();
  });
  it('asks for the missing destination after a name-only creation request', async () => {
    const result = await runOnlinePlanner({ trip: null, messages: [{ role: 'user', content: 'Create a trip named Summer escape.' }] }, {
      baseUrl: process.env.PLANNER_BASE_URL || '', model: process.env.PLANNER_MODEL || '',
      apiKey: process.env.PLANNER_API_KEY || '', searchKey: process.env.BRAVE_SEARCH_API_KEY,
    }, AbortSignal.timeout(150000));
    console.info('Name-only planner result:', JSON.stringify(result));
    expect(result.answer.actions).toEqual([]);
    expect(result.answer.reply).toMatch(/destination|where|location/i);
  }, 160000);
  it('returns a complete confirmation proposal when creation details are supplied', async () => {
    const result = await runOnlinePlanner({ trip: null, messages: [{ role: 'user',
      content: 'Please propose creating a trip named Manali weekend, destination Manali, dates 2026-10-20 to 2026-10-22, currency INR, members Alice and Bob. Only propose creating this trip, with exactly these details. Do not research or claim it has been saved.' }] }, {
      baseUrl: process.env.PLANNER_BASE_URL || '', model: process.env.PLANNER_MODEL || '',
      apiKey: process.env.PLANNER_API_KEY || '', searchKey: process.env.BRAVE_SEARCH_API_KEY,
    }, AbortSignal.timeout(150000));
    console.info('Creation planner result:', JSON.stringify(result));
    expect(result.answer.actions).toHaveLength(1);
    expect(result.answer.actions[0]).toMatchObject({ type: 'create_trip', name: 'Manali weekend', destination: 'Manali',
      startDate: '2026-10-20', endDate: '2026-10-22', currency: 'INR', members: ['Alice', 'Bob'] });
    expect(result.spots?.length).toBeGreaterThan(0);
    expect(result.spots?.every((spot) => Number.isFinite(spot.lat) && spot.sourceUrl.startsWith('https://'))).toBe(true);
  }, 160000);
  it('researches a destination and returns validated source-backed advice without creating a trip', async () => {
    const result = await runOnlinePlanner({ trip: null, messages: [{ role: 'user',
      content: 'Use the search_destination tool to research Manali, Himachal Pradesh, India. Give a short background summary with source citations and two outdoor-trip suggestions labeled as suggestions. Explain that current conditions/prices need separate checking. Do not create a trip or propose changes.' }] }, {
      baseUrl: process.env.PLANNER_BASE_URL || '', model: process.env.PLANNER_MODEL || '',
      apiKey: process.env.PLANNER_API_KEY || '', searchKey: process.env.BRAVE_SEARCH_API_KEY,
    }, AbortSignal.timeout(150000));
    console.info('Online planner result:', JSON.stringify(result));
    expect(result.model).toBe(process.env.PLANNER_MODEL);
    expect(result.answer.reply.length).toBeGreaterThan(0);
    expect(result.answer.actions).toEqual([]);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.every((source) => source.url.startsWith('https://') && !!source.retrievedAt)).toBe(true);
  }, 160000);
});
