import { useCallback, useEffect, useState, type FormEvent } from 'react';

export function PlannerAccess() {
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin', signal });
      if (!response.ok) return;
      const status = await response.json() as { requiresSignIn: boolean; signedIn: boolean };
      setRequiresSignIn(status.requiresSignIn); setSignedIn(status.signedIn);
    } catch { /* Planner failures have their own retry message; manual tools still work. */ }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const expired = () => { setRequiresSignIn(true); setSignedIn(false); setExpanded(true); };
    window.addEventListener('planner-access-required', expired);
    return () => { controller.abort(); window.removeEventListener('planner-access-required', expired); };
  }, [refresh]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/session', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many sign-in attempts. Please try again later.' : 'Could not sign in. Check the access password and try again.');
      setPassword(''); setSignedIn(true); setExpanded(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      setSignedIn(false); setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  }
  if (!requiresSignIn) return null;
  return <section className="planner-access" aria-label="Online planning access">
    {signedIn ? <div className="row"><span className="chip on">Online planning unlocked</span>
      <button type="button" className="ghost" disabled={busy} onClick={() => void signOut()}>Sign out</button></div>
      : <button type="button" className="secondary" onClick={() => setExpanded((value) => !value)}>Sign in for online planning</button>}
    {expanded && !signedIn && <form onSubmit={signIn} className="planner-signin">
      <p>Enter the demo access password to use online planning. Trip tools and your saved data remain available without signing in.</p>
      <label htmlFor="planner-access-password">Access password</label>
      <input id="planner-access-password" type="password" autoComplete="current-password" required maxLength={512}
        value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
      <button type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      <p className="muted">This unlocks the demo planner; it does not create an account or sync your trips.</p>
    </form>}
    {error && <p role="alert" className="photo-error">{error}</p>}
  </section>;
}
