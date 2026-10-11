import { afterEach, describe, expect, it, vi } from 'vitest';
import { runOnlinePlanner } from './planner';
const input = { messages: [{ role: 'user', content: 'Research Manali' }], trip: null };
const settings = { baseUrl: 'https://models.example/v1', model: 'large-planner', apiKey: 'server-test-key' };
const signal = () => new AbortController().signal;
const response = (data: unknown) => ({ ok: true, json: async () => data });
afterEach(() => vi.unstubAllGlobals());
describe('online planner gateway', () => {
  it('carries sourced spots into a creation proposal', async () => {
    let requestCount = 0;
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('generator=search')) return response({ query: { pages: { '1': { pageid: 1, index: 1, title: 'Manali', coordinates: [{ lat: 32, lon: 77 }] } } } });
      if (url.includes('generator=geosearch')) return response({ query: { pages: { '2': { pageid: 2, title: 'Temple', coordinates: [{ lat: 32.01, lon: 77.01 }], fullurl: 'https://en.wikipedia.org/wiki/Temple' } } } });
      requestCount++;
      return response({ choices: [{ message: requestCount === 1 ? { role: 'assistant', content: null,
        tool_calls: [{ id: 'spots1', type: 'function', function: { name: 'find_destination_spots', arguments: '{"destination":"Manali Himachal Pradesh"}' } }] }
        : { role: 'assistant', content: JSON.stringify({ reply: 'Review this trip and the temple stop.', actions: [{
          type: 'create_trip', name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: [], spotIds: ['wiki:2'],
        }] }) } }] });
    });
    vi.stubGlobal('fetch', fetcher);
    const result = await runOnlinePlanner(input, settings, signal());
    expect(result.spots[0]).toMatchObject({ id: 'wiki:2', name: 'Temple', lat: 32.01 });
    expect(result.answer.actions[0]).toMatchObject({ spotIds: ['wiki:2'] });
    expect(result.sources[0]?.title).toBe('Temple');
  });
  it('rejects invented spot references instead of creating guessed waypoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ choices: [{ message: { role: 'assistant', content: JSON.stringify({ reply: 'Review',
      actions: [{ type: 'create_trip', name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: [], spotIds: ['invented'] }] }) } }] })));
    await expect(runOnlinePlanner({ ...input, suggestedSpots: [{ id: 'wiki:2', name: 'Temple' }] }, settings, signal())).rejects.toThrow('unknown destination spot');
  });
  it('accepts a single fenced JSON reply while still validating action fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ choices: [{ message: { role: 'assistant',
      content: '```json\n{"reply":"Where would you like to go?","actions":[]}\n```' } }] })));
    expect((await runOnlinePlanner(input, settings, signal())).answer.actions).toEqual([]);
  });
  it('repairs a name-only incomplete action into a clarification without executing anything', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: JSON.stringify({
        reply: 'Where would you like to go?', actions: [{ function: 'create_trip', parameters: { name: 'Summer escape' } }],
      }) } }] }))
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: '{"reply":"Where would you like to go for Summer escape?","actions":[]}' } }] }));
    vi.stubGlobal('fetch', fetcher);
    const result = await runOnlinePlanner({ ...input, messages: [{ role: 'user', content: 'Create a trip named Summer escape.' }] }, settings, signal());
    expect(result.answer.actions).toEqual([]);
    expect(result.answer.reply).toContain('Where');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1]?.[1].body).messages.at(-1).content).toContain('Correct it once');
  });
  it('allows only one output repair and keeps repeated invalid actions rejected', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ choices: [{ message: { role: 'assistant',
      content: '{"reply":"Created","actions":[{"function":"create_trip","parameters":{"name":"Trip"}}]}' } }] }));
    vi.stubGlobal('fetch', fetcher);
    await expect(runOnlinePlanner(input, settings, signal())).rejects.toMatchObject({ code: 'invalid_model_reply' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('surfaces paid-access rejection without retries or credential exposure', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 402 });
    vi.stubGlobal('fetch', fetcher);
    await expect(runOnlinePlanner(input, settings, signal())).rejects.toMatchObject({ status: 402 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('requires server configuration, rejects browser credential fields and non-HTTPS model endpoints', async () => {
    await expect(runOnlinePlanner(input, { ...settings, apiKey: '' }, signal())).rejects.toMatchObject({ status: 503 });
    await expect(runOnlinePlanner({ ...input, apiKey: 'from-browser' }, settings, signal())).rejects.toThrow();
    await expect(runOnlinePlanner(input, { ...settings, baseUrl: 'http://remote.example' }, signal())).rejects.toThrow('HTTPS');
  });
  it('executes destination research and returns only retrieved source URLs with timestamps', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: null,
        tool_calls: [{ id: 'call1', type: 'function', function: { name: 'search_destination', arguments: '{"query":"Manali"}' } }] } }] }))
      .mockResolvedValueOnce(response({ query: { search: [{ title: 'Manali', pageid: 123, snippet: '<b>Manali</b> in the mountains' }] } }))
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: '{"reply":"Background information [1]. Check current conditions separately.","actions":[]}' } }] }));
    vi.stubGlobal('fetch', fetcher);
    const result = await runOnlinePlanner(input, settings, signal());
    expect(result.sources[0]).toMatchObject({ title: 'Manali', url: 'https://en.wikipedia.org/?curid=123' });
    expect(result.sources[0]?.retrievedAt).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain('server-test-key');
    expect(fetcher.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer server-test-key');
    expect(fetcher.mock.calls[1]?.[0]).toContain('en.wikipedia.org');
    const finalRequest = JSON.parse(fetcher.mock.calls[2]?.[1].body);
    expect(finalRequest.messages.at(-1).role).toBe('tool');
    expect(finalRequest.messages.at(-1).content).toContain('citation');
  });
  it('rejects unsupported tools rather than fetching arbitrary model URLs', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ choices: [{ message: { role: 'assistant', content: null,
      tool_calls: [{ id: 'x', type: 'function', function: { name: 'fetch_url', arguments: '{"url":"http://localhost/private"}' } }] } }] }));
    vi.stubGlobal('fetch', fetcher);
    await expect(runOnlinePlanner(input, settings, signal())).rejects.toThrow('unavailable research tool');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('rejects manager mutations during online planning', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ choices: [{ message: { role: 'assistant',
      content: JSON.stringify({ reply: 'Add member', actions: [{ type: 'add_member', name: 'A' }] }) } }] })));
    await expect(runOnlinePlanner(input, settings, signal())).rejects.toThrow('manager-only');
  });
  it('enforces a finite research loop', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('wikipedia.org')) return response({ query: { search: [] } });
      calls++;
      return response({ choices: [{ message: { role: 'assistant', content: null,
        tool_calls: [{ id: `c${calls}`, type: 'function', function: { name: 'search_destination', arguments: '{"query":"Manali"}' } }] } }] });
    }));
    await expect(runOnlinePlanner(input, settings, signal())).rejects.toThrow('step limit');
    expect(calls).toBe(4);
  });
  it('enables broad web search only with a server-held search credential', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: null,
        tool_calls: [{ id: 'web1', type: 'function', function: { name: 'search_web', arguments: '{"query":"Manali official tourism"}' } }] } }] }))
      .mockResolvedValueOnce(response({ web: { results: [{ title: 'Tourism', url: 'https://tourism.example/Manali', description: 'Travel guide' }] } }))
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: '{"reply":"See the travel guide [1].","actions":[]}' } }] }));
    vi.stubGlobal('fetch', fetcher);
    const result = await runOnlinePlanner(input, { ...settings, searchKey: 'server-search-key' }, signal());
    expect(result.sources[0]?.url).toBe('https://tourism.example/Manali');
    expect(fetcher.mock.calls[1]?.[1].headers['X-Subscription-Token']).toBe('server-search-key');
    expect(JSON.stringify(result)).not.toContain('server-search-key');
  });
  it('feeds research failure back to the model without invented sources', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: null,
        tool_calls: [{ id: 'fail1', type: 'function', function: { name: 'search_destination', arguments: '{"query":"Manali"}' } }] } }] }))
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(response({ choices: [{ message: { role: 'assistant', content: '{"reply":"Research service failed; suggestions are unverified.","actions":[]}' } }] }));
    vi.stubGlobal('fetch', fetcher);
    const result = await runOnlinePlanner(input, settings, signal());
    expect(result.sources).toEqual([]);
    expect(JSON.parse(fetcher.mock.calls[2]?.[1].body).messages.at(-1).content).toContain('unavailable');
  });
  it('honors cancellation before making paid model requests', async () => {
    const controller = new AbortController(); controller.abort();
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(runOnlinePlanner(input, settings, controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
