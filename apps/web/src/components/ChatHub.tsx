import { useEffect, useState } from 'react';
import type { ChatSession, ManualView } from '@trip-polama/core';
import { createPlanningChat, ensureTripChat, listChatSessions } from '@trip-polama/store';
import { TripList } from './TripList';
import { TripChat } from './TripChat';

export function ChatHub({ onOpenManual }: { onOpenManual: (tripId: string, view: ManualView) => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // Existing active-chat key is a data-compatibility identifier, not branding.
  const [selected, setSelected] = useState<string>(() => localStorage.getItem('trailbrain-active-chat') ?? '');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listChatSessions().then((items) => {
      if (!active) return;
      setSessions(items);
      if (selected && !items.some((item) => item.id === selected)) setSelected('');
    }).catch(() => { if (active) setError('Could not load conversations. Check device storage and reload.'); });
    return () => { active = false; };
  }, [revision, selected]);

  function choose(id: string) {
    localStorage.setItem('trailbrain-active-chat', id);
    setSelected(id);
    setError(null);
  }

  async function start() {
    try { const session = await createPlanningChat(); choose(session.id); setRevision((value) => value + 1); }
    catch { setError('Could not start a conversation. Please try again.'); }
  }

  async function openTrip(tripId: string) {
    try { const session = await ensureTripChat(tripId); choose(session.id); setRevision((value) => value + 1); }
    catch { setError('Could not open this trip conversation. Please try again.'); }
  }

  return (
    <div className="chat-hub">
      <aside className="trip-sidebar" aria-label="Trips and conversations">
        <button type="button" className="start-chat" onClick={() => void start()}>Plan a new adventure</button>
        <p className="muted">Explore first. Create the trip when you are ready.</p>
        <TripList refreshKey={revision} onOpen={(tripId) => void openTrip(tripId)} />
        {sessions.some((session) => !session.tripId) && <section className="exploring-chats">
          <h2>Still exploring</h2>
          {sessions.filter((session) => !session.tripId).map((session) => (
            <button type="button" key={session.id} className={`chat-choice ${selected === session.id ? 'active' : ''}`}
              onClick={() => choose(session.id)}>{session.title}</button>
          ))}
        </section>}
      </aside>
      <main className="conversation-main">
        {error && <p role="alert" className="photo-error">{error}</p>}
        {selected ? <TripChat key={selected} sessionId={selected}
          onChanged={() => setRevision((value) => value + 1)} onOpenManual={onOpenManual} />
          : <section className="chat-welcome">
            <span className="chat-eyebrow">A conversation before a destination</span>
            <h2>Where should we go next?</h2>
            <p>Explore an idea with your trip planner, or choose a trip and let your manager help with the details.</p>
            <button type="button" onClick={() => void start()}>Start exploring</button>
            <p className="muted">One conversation per trip. Manual tools are always available.</p>
          </section>}
      </main>
    </div>
  );
}
