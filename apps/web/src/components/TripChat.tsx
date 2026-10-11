import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import type { ChatMessage, ChatSession, ManualView, Trip, AgentRole } from '@trip-polama/core';
import { manualViews, sessionAgent, isReadOnlyAction, quickTripRead, readTripData } from '@trip-polama/core';
import { chatAsManager, chatAsPlanner, type ChatModelConfig } from '@trip-polama/online-brain';
import { db, getTripFull, listChatMessages, saveChatMessage, confirmChatAction, dismissChatAction, setSessionAgent, saveChatPhotos } from '@trip-polama/store';
import { ActionReview } from './ActionReview';
import { PhotoPreview } from './PhotoPreview';
import { validatePhoto } from './photoInput';

function savedConfig(): ChatModelConfig | null {
  try {
    // Persisted preference key intentionally unchanged to retain existing setup.
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const photoPicker = useRef<HTMLInputElement>(null);
  const [config] = useState<ChatModelConfig | null>(savedConfig);
  const pending = useRef<AbortController>();
  const alive = useRef(true);
  const bottom = useRef<HTMLDivElement>(null);
  const agent = session ? sessionAgent(session) : 'planner';

  const load = useCallback(async () => {
    const nextSession = await db.chatSessions.get(sessionId);
    if (!nextSession) throw new Error('Conversation not found.');
    const [history, currentTrip] = await Promise.all([
      listChatMessages(sessionId), nextSession.tripId ? getTripFull(nextSession.tripId) : Promise.resolve(null),
    ]);
    if (alive.current) { setSession(nextSession); setMessages(history); setTrip(currentTrip); }
    return { history, currentTrip, currentSession: nextSession };
  }, [sessionId]);

  useEffect(() => {
    alive.current = true;
    void load().catch((reason: Error) => setError(reason.message));
    return () => { alive.current = false; pending.current?.abort(); };
  }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages.length]);

  async function respond() {
    const controller = new AbortController();
    pending.current = controller;
    const { history, currentTrip, currentSession } = await load();
    const role = sessionAgent(currentSession);
    let answer;
    let sources;
    let modelName;
    let spots;
    let localRead = false;
    if (role === 'planner') {
      const result = await chatAsPlanner(history, currentTrip, '/api/planner/chat', controller.signal, currentSession.suggestedSpots);
      answer = result.answer; sources = result.sources; modelName = result.model; spots = result.spots;
    } else {
      if (!currentTrip) throw new Error('Manager requires a saved trip.');
      const last = history.at(-1);
      const read = last?.role === 'user' ? quickTripRead(last.content) : null;
      if (read) { answer = { reply: readTripData(currentTrip, read), actions: [] }; localRead = true; }
      else {
        if (!config) throw new Error('Your local trip assistant is unavailable. You can still use the trip tools; your conversation stays saved.');
        const result = await chatAsManager(history, currentTrip, config, controller.signal);
        answer = result; localRead = !!result.localRead; modelName = config.model;
      }
    }
    if (controller.signal.aborted || !alive.current) return;
    const saved = await saveChatMessage({ sessionId, role: 'assistant', source: localRead ? 'local' : 'model', content: answer.reply,
      actions: answer.actions, actionStatuses: answer.actions.map(() => 'pending'),
      agentRole: role, model: modelName, sources, spots });
    for (const [index, action] of answer.actions.entries()) {
      if (!isReadOnlyAction(action)) continue;
      const location = action.type === 'suggest_next' ? await currentLocation() : undefined;
      if (!alive.current || controller.signal.aborted) return;
      const result = await confirmChatAction(sessionId, saved.id, index, location, { readOnly: true });
      if (result.view) { await load(); onChanged(); onOpenManual(result.tripId, result.view); return; }
    }
    await load();
    onChanged();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if ((!draft.trim() && !attachments.length) || busy) return;
    setBusy(true); setError(null);
    try {
      if (attachments.length) {
        await saveChatPhotos(sessionId, attachments, draft.trim());
        setAttachments([]); setDraft('');
        if (photoPicker.current) photoPicker.current.value = '';
        await load(); onChanged();
        return;
      }
      await saveChatMessage({ sessionId, role: 'user', content: draft.trim(), agentRole: agent });
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

  function currentLocation(): Promise<{ lat: number; lon: number }> {
    if (!navigator.geolocation) return Promise.reject(new Error('Device location is unavailable. Use the waypoint map instead.'));
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => reject(new Error('Location permission or GPS is unavailable. Use the waypoint map instead.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ));
  }

  async function confirm(message: ChatMessage, index: number, selectedSpotIds?: string[]) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      let location: { lat: number; lon: number } | undefined;
      if (['add_waypoint_here', 'check_in_here', 'suggest_next'].includes(message.actions?.[index]?.type ?? '')) {
        location = await currentLocation();
      }
      if (!alive.current) return;
      const action = message.actions?.[index];
      const result = await confirmChatAction(sessionId, message.id, index, location,
        { selectedSpotIds, readOnly: action ? isReadOnlyAction(action) : false });
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

  async function switchAgent(role: AgentRole) {
    if (busy) return;
    try { await setSessionAgent(sessionId, role); await load(); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not switch agent.'); }
  }

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const problem = files.map(validatePhoto).find(Boolean);
    if (problem || files.length > 10 || files.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) {
      setError(problem || 'Choose up to 10 photos, totaling at most 50 MB.');
      event.target.value = '';
      return;
    }
    setAttachments(files); setError(null);
  }

  return (
    <section className="trip-chat" aria-label="Trip conversation">
      <header className="conversation-header">
        <div><span className="chat-eyebrow">{agent === 'manager' ? 'Your trip manager' : 'Your trip planner'}</span>
          <h2>{trip?.name ?? session?.title ?? 'Loading conversation...'}</h2></div>
        <span className="badge">{agent === 'planner' ? 'Online planning' : 'Local trip management'}</span>
      </header>
      <div className="agent-routing">
        {agent === 'planner' ? <p className="muted">Explore destinations and plan your adventure with online research.
          Your conversation and planning details are shared with the online assistant. Photos and precise location are not attached.</p>
          : <p className="muted">Manage expenses, stops and your group using saved trip data.
            Online research is used only when you choose Research / Replan.</p>}
        {session?.tripId && <button type="button" className="secondary" disabled={busy}
          onClick={() => void switchAgent(agent === 'manager' ? 'planner' : 'manager')}>
          {agent === 'manager' ? 'Research / Replan online' : 'Return to local manager'}
        </button>}
      </div>
      {session?.tripId && <nav className="chat-tools" aria-label="Manual trip tools">
        {manualViews.map((view) => <button type="button" className="ghost" key={view}
          disabled={busy} onClick={() => onOpenManual(session.tripId!, view)}>
          {view === 'suggest' ? 'Next up' : view}</button>)}
      </nav>}
      <div className="chat-history" aria-label="Conversation history" aria-live="polite">
        {!messages.length && <div className="conversation-intro">
          <h3>{agent === 'manager' ? 'Let’s take care of the trip.' : 'An idea is enough to get started.'}</h3>
          <p>{agent === 'manager' ? 'Ask about the budget, record an expense, manage stops, or open any manual tool.'
            : 'Tell me where you would like to go, your dates, who is joining, or what you are curious about.'}</p>
          <p className="muted">Proposed changes wait for your confirmation. Nothing is booked or shared automatically.</p>
        </div>}
        {messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
          <span className="message-author">{message.role === 'user' ? 'You' : message.source === 'local' ? 'Trip activity'
            : message.agentRole ? `${message.agentRole === 'planner' ? 'Online planner' : 'Local manager'} · ${message.model ?? 'model'}` : 'trip-polama (earlier message)'}</span>
          <p>{message.content}</p>
          {!!message.photoIds?.length && <div className="chat-attachments">{message.photoIds.map((id) => {
            const photo = trip?.photos.find((item) => item.id === id);
            return photo?.image ? <PhotoPreview key={id} image={photo.image} alt={photo.note || 'Trip photo'} /> : null;
          })}</div>}
          {!!message.spots?.length && <section aria-label="Suggested destination spots" className="suggested-spots">
            <h3>Spots to explore</h3>
            {message.spots.map((spot) => <div key={spot.id}><strong>{spot.name}</strong>
              <p className="muted">{spot.description}</p><a href={spot.sourceUrl} target="_blank" rel="noopener noreferrer">Place reference</a></div>)}
            <p className="muted">Review these places before creating the trip. Select the stops you want in the trip confirmation.</p>
          </section>}
          {!!message.sources?.length && <ol className="research-sources" aria-label="Research sources">
            {message.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
              <span className="muted"> · Retrieved {new Date(source.retrievedAt).toLocaleString()}</span></li>)}
          </ol>}
          {message.actions?.map((action, index) => <ActionReview key={index} action={action}
            status={message.actionStatuses?.[index] ?? 'pending'} trip={trip} spots={session?.suggestedSpots ?? []} busy={busy}
            onConfirm={(selected) => void confirm(message, index, selected)} onDismiss={() => void dismiss(message.id, index)} />)}
        </article>)}
        {busy && <p role="status" className="muted">Working...</p>}
        <div ref={bottom} />
      </div>
      {error && <div role="alert" className="chat-error"><p>{error}</p></div>}
      {messages.at(-1)?.role === 'user' && !busy && <button type="button" className="secondary"
        disabled={agent === 'manager' && !config} onClick={() => void retry()}>Get / retry response</button>}
      <form className="chat-composer" onSubmit={send}>
        {!!attachments.length && <div className="chat-attachments" aria-label="Selected photos">
          {attachments.map((file, index) => <div key={`${file.name}-${index}`}><PhotoPreview image={file} alt={`Selected photo ${index + 1}`} />
            <button type="button" className="ghost" disabled={busy} onClick={() => {
              setAttachments((files) => files.filter((_, item) => item !== index));
              if (photoPicker.current) photoPicker.current.value = '';
            }}>Remove photo {index + 1}</button></div>)}
          <p className="muted">Photos are saved locally to this trip, never sent to a model.</p>
        </div>}
        <label htmlFor="trip-message">Talk to your {agent}</label>
        {agent === 'manager' && <span className="muted">Quick reads: summary, expenses, remaining stops, list members.</span>}
        <textarea id="trip-message" value={draft} onChange={(event) => setDraft(event.target.value)}
          rows={3} maxLength={4000} placeholder={agent === 'manager' ? 'What do we need to take care of?' : 'I’m thinking about a weekend in the hills...'} disabled={busy} />
        <input ref={photoPicker} type="file" accept="image/*" multiple hidden onChange={selectPhotos} aria-label="Choose trip photos" />
        <div className="row">
          <button type="button" className="secondary photo-attach" disabled={busy || !session?.tripId}
            aria-label="Add photos" title={session?.tripId ? 'Add photos to this trip' : 'Create a trip to add photos'} onClick={() => photoPicker.current?.click()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /></svg>
          </button>
          <button type="submit" disabled={busy || (!draft.trim() && !attachments.length) || !session}>{attachments.length ? `Save ${attachments.length} photo${attachments.length === 1 ? '' : 's'}` : 'Send'}</button>
          {busy && pending.current && <button type="button" className="ghost" onClick={() => pending.current?.abort()}>Stop reply</button>}
        </div>
      </form>
      <details className="model-settings"><summary>About your trip assistants</summary>
        <p><strong>Planner:</strong> helps explore destinations and build or revise your itinerary using online research.
          Source links let you check the information behind its suggestions.</p>
        <p><strong>Manager:</strong> helps with expenses, stops, group check-ins and summaries of your saved trip.
          You can always use the trip tools yourself.</p>
        <p className="muted">Research provides destination background. Check current weather, travel conditions,
          permits, prices and availability separately before heading out.</p>
        <p className="muted">Online planning shares conversation text and relevant planning details with an online service.
          Private details you write in chat may be included. Proposed changes always wait for your confirmation.</p>
      </details>
    </section>
  );
}
