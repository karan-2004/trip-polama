import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage, ChatSession, ManualView, Trip } from '@trailbrain/core';
import { describeAction, manualViews } from '@trailbrain/core';
import { chatWithTrip, type ChatModelConfig } from '@trailbrain/online-brain';
import { db, getTripFull, listChatMessages, saveChatMessage, confirmChatAction, dismissChatAction } from '@trailbrain/store';

function savedConfig(): ChatModelConfig | null {
  try {
    const value = JSON.parse(localStorage.getItem('trailbrain-chat-model') ?? 'null') as ChatModelConfig | null;
    if (value && typeof value.host === 'string' && typeof value.model === 'string') return value;
  } catch { /* Ignore corrupt preferences, not chat records. */ }
  return import.meta.env.VITE_OLLAMA_URL ? { host: import.meta.env.VITE_OLLAMA_URL,
    model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b' } : null;
}

export function TripChat({ sessionId, onChanged, onOpenManual }: {
  sessionId: string;
  onChanged: () => void;
  onOpenManual: (tripId: string, view: ManualView) => void;
}) {
  const [session, setSession] = useState<ChatSession>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChatModelConfig | null>(savedConfig);
  const [host, setHost] = useState(config?.host ?? 'http://localhost:11434');
  const [model, setModel] = useState(config?.model ?? 'llama3.2:3b');
  const pending = useRef<AbortController>();
  const alive = useRef(true);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const nextSession = await db.chatSessions.get(sessionId);
    if (!nextSession) throw new Error('Conversation not found.');
    const [history, currentTrip] = await Promise.all([
      listChatMessages(sessionId), nextSession.tripId ? getTripFull(nextSession.tripId) : Promise.resolve(null),
    ]);
    if (alive.current) { setSession(nextSession); setMessages(history); setTrip(currentTrip); }
    return { history, currentTrip };
  }, [sessionId]);

  useEffect(() => {
    alive.current = true;
    void load().catch((reason: Error) => setError(reason.message));
    return () => { alive.current = false; pending.current?.abort(); };
  }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages.length]);

  async function respond() {
    if (!config) throw new Error('Set up a model below to get replies. Your conversation is saved locally.');
    const controller = new AbortController();
    pending.current = controller;
    const { history, currentTrip } = await load();
    const answer = await chatWithTrip(history, currentTrip, config, controller.signal);
    if (controller.signal.aborted || !alive.current) return;
    await saveChatMessage({ sessionId, role: 'assistant', source: 'model', content: answer.reply,
      actions: answer.actions, actionStatuses: answer.actions.map(() => 'pending') });
    await load();
    onChanged();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await saveChatMessage({ sessionId, role: 'user', content: draft.trim() });
      setDraft('');
      await load(); onChanged();
      await respond();
    } catch (reason) {
      if (alive.current) setError(reason instanceof Error ? reason.message : 'Could not reach the model. Check your endpoint; the conversation is saved.');
    } finally { pending.current = undefined; if (alive.current) setBusy(false); }
  }

  async function retry() {
    if (busy) return;
    setBusy(true); setError(null);
    try { await respond(); }
    catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Could not get a response.'); }
    finally { pending.current = undefined; if (alive.current) setBusy(false); }
  }

  async function confirm(message: ChatMessage, index: number) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      let location: { lat: number; lon: number } | undefined;
      if (['add_waypoint_here', 'check_in_here', 'suggest_next'].includes(message.actions?.[index]?.type ?? '')) {
        if (!navigator.geolocation) throw new Error('Device location is unavailable. Use the map in manual Waypoints.');
        location = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
          () => reject(new Error('Location permission or GPS is unavailable. Use the map in manual Waypoints.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        ));
      }
      if (!alive.current) return;
      const result = await confirmChatAction(sessionId, message.id, index, location);
      await load(); onChanged();
      if (result.view && alive.current) onOpenManual(result.tripId, result.view);
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Could not apply the proposal.'); }
    finally { if (alive.current) setBusy(false); }
  }

  async function dismiss(messageId: string, index: number) {
    setBusy(true); setError(null);
    try { await dismissChatAction(sessionId, messageId, index); await load(); }
    catch { setError('Could not dismiss the proposal. Please try again.'); }
    finally { if (alive.current) setBusy(false); }
  }

  function configure(event: FormEvent) {
    event.preventDefault();
    try {
      const url = new URL(host);
      if (!['http:', 'https:'].includes(url.protocol) || !model.trim()) throw new Error('Use an HTTP(S) endpoint and a model name.');
      const next = { host: host.replace(/\/$/, ''), model: model.trim() };
      localStorage.setItem('trailbrain-chat-model', JSON.stringify(next)); setConfig(next); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save model preferences.'); }
  }

  return (
    <section className="trip-chat" aria-label="Trip conversation">
      <header className="conversation-header">
        <div><span className="chat-eyebrow">{session?.tripId ? 'Your trip manager' : 'Your trip planner'}</span>
          <h2>{trip?.name ?? session?.title ?? 'Loading conversation...'}</h2></div>
        <span className="badge">{config ? `Model: ${config.model}` : 'Model not configured'}</span>
      </header>
      {session?.tripId && <nav className="chat-tools" aria-label="Manual trip tools">
        {manualViews.map((view) => <button type="button" className="ghost" key={view}
          disabled={busy} onClick={() => onOpenManual(session.tripId!, view)}>
          {view === 'suggest' ? 'Next up' : view}</button>)}
      </nav>}
      <div className="chat-history" aria-label="Conversation history" aria-live="polite">
        {!messages.length && <div className="conversation-intro">
          <h3>{session?.tripId ? 'Let’s take care of the trip.' : 'An idea is enough to get started.'}</h3>
          <p>{session?.tripId ? 'Ask about the budget, record an expense, manage stops, or open any manual tool.'
            : 'Tell me where you would like to go, your dates, who is joining, or what you are curious about.'}</p>
          <p className="muted">Proposed changes wait for your confirmation. Nothing is booked or shared automatically.</p>
        </div>}
        {messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
          <span className="message-author">{message.role === 'user' ? 'You' : message.source === 'local' ? 'Trip activity' : 'TrailBrain'}</span>
          <p>{message.content}</p>
          {message.actions?.map((action, index) => <div key={index} className="action-card">
            {message.actionStatuses?.[index] === 'pending' && <p className="muted">Proposed only. Waiting for your confirmation.</p>}
            <strong>{describeAction(action)}</strong>
            <pre>{JSON.stringify(action, null, 2)}</pre>
            {message.actionStatuses?.[index] === 'pending' ? <div className="row">
              <button type="button" disabled={busy} onClick={() => void confirm(message, index)}>
                {action.type === 'open_view' ? 'Open tool' : 'Confirm change'}</button>
              <button type="button" className="ghost" disabled={busy} onClick={() => void dismiss(message.id, index)}>Dismiss</button>
            </div> : <span className="badge">{message.actionStatuses?.[index]}</span>}
          </div>)}
        </article>)}
        {busy && <p role="status" className="muted">Working...</p>}
        <div ref={bottom} />
      </div>
      {error && <div role="alert" className="chat-error"><p>{error}</p></div>}
      {messages.at(-1)?.role === 'user' && !busy && <button type="button" className="secondary"
        disabled={!config} onClick={() => void retry()}>Get / retry response</button>}
      <form className="chat-composer" onSubmit={send}>
        <label htmlFor="trip-message">Talk to your {session?.tripId ? 'manager' : 'planner'}</label>
        <textarea id="trip-message" value={draft} onChange={(event) => setDraft(event.target.value)}
          rows={3} maxLength={4000} placeholder={session?.tripId ? 'What do we need to take care of?' : 'I’m thinking about a weekend in the hills...'} disabled={busy} />
        <div className="row"><button type="submit" disabled={busy || !draft.trim() || !session}>Send</button>
          {busy && pending.current && <button type="button" className="ghost" onClick={() => pending.current?.abort()}>Stop reply</button>}
        </div>
      </form>
      <details className="model-settings" open={!config}>
        <summary>Model connection</summary>
        <form onSubmit={configure} className="grid">
          <div className="field"><label htmlFor="model-host">Ollama endpoint</label>
            <input id="model-host" type="url" value={host} onChange={(event) => setHost(event.target.value)} required /></div>
          <div className="field"><label htmlFor="model-name">Installed model</label>
            <input id="model-name" value={model} onChange={(event) => setModel(event.target.value)} required /></div>
          <button type="submit" disabled={busy}>Use this model</button>
        </form>
        <p className="muted">Chat sends your message text and trip details to this endpoint. Structured GPS fields and image files are excluded; message text is sent as written.
          A local Ollama server is separate from on-device browser inference; WebLLM is still planned.</p>
      </details>
    </section>
  );
}
