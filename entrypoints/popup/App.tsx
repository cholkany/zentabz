import { useState, useEffect } from 'react';
import type { Session } from '@/utils/types';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const result = await browser.runtime.sendMessage({ type: 'get-sessions' });
      if (result.success) {
        setSessions(
          (result.sessions as Session[]).sort((a, b) => b.createdAt - a.createdAt),
        );
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
    setLoading(false);
  }

  async function handleSaveCurrent() {
    const name = prompt('Session name:');
    if (name === null) return;
    await browser.runtime.sendMessage({
      type: 'save-session',
      name: name.trim() || `Session ${new Date().toLocaleString()}`,
      allWindows: false,
    });
    loadSessions();
  }

  async function handleSaveAll() {
    const name = prompt('Session name:');
    if (name === null) return;
    await browser.runtime.sendMessage({
      type: 'save-session',
      name: name.trim() || `Session ${new Date().toLocaleString()}`,
      allWindows: true,
    });
    loadSessions();
  }

  async function handleRestore(sessionId: string, newWindow: boolean) {
    await browser.runtime.sendMessage({
      type: 'restore-session',
      sessionId,
      newWindow,
    });
  }

  async function handleDelete(sessionId: string) {
    if (!confirm('Delete this session?')) return;
    await browser.runtime.sendMessage({ type: 'delete-session', sessionId });
    loadSessions();
  }

  function openManager() {
    browser.tabs.create({ url: browser.runtime.getURL('/manager.html') });
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function totalTabs(session: Session) {
    return session.windows.reduce((sum, w) => sum + w.tabs.length, 0);
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <h1>Tab Manager</h1>
      </div>

      <div className="popup-actions">
        <button className="btn btn-primary" onClick={handleSaveCurrent}>
          Save Current Window
        </button>
        <button className="btn btn-secondary" onClick={handleSaveAll}>
          Save All Windows
        </button>
      </div>

      <div className="popup-sessions">
        <h2>Recent Sessions</h2>
        {loading && <p className="muted">Loading...</p>}
        {!loading && sessions.length === 0 && (
          <p className="muted">No saved sessions yet.</p>
        )}
        {sessions.slice(0, 10).map(session => (
          <div key={session.id} className="session-row">
            <div className="session-row-info">
              <span className="session-row-name">{session.name}</span>
              <span className="session-row-meta">
                {totalTabs(session)} tab{totalTabs(session) !== 1 ? 's' : ''}
                {' · '}
                {session.windows.length > 1
                  ? `${session.windows.length} windows · `
                  : ''}
                {formatDate(session.createdAt)}
              </span>
            </div>
            <div className="session-row-actions">
              <button
                className="btn-sm"
                onClick={() => handleRestore(session.id, false)}
                title="Restore in current window"
              >
                Open
              </button>
              <button
                className="btn-sm"
                onClick={() => handleRestore(session.id, true)}
                title="Restore in new window"
              >
                New
              </button>
              <button
                className="btn-sm btn-sm-danger"
                onClick={() => handleDelete(session.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="popup-footer">
        <button className="btn-link" onClick={openManager}>
          Open Full Manager →
        </button>
      </div>
    </div>
  );
}

export default App;
