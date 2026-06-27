import { useState, useEffect } from 'react';
import type { Session } from '@/utils/types';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const result = await browser.runtime.sendMessage({ type: 'get-sessions' });
      if (result.success) {
        setSessions(
          (result.sessions as Session[]).sort((a, b) => b.updatedAt - a.updatedAt),
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
    await browser.runtime.sendMessage({ type: 'delete-session', sessionId });
    setDeleteConfirmId(null);
    loadSessions();
  }

  async function handleRename(sessionId: string) {
    if (renameValue.trim()) {
      await browser.runtime.sendMessage({
        type: 'rename-session',
        sessionId,
        name: renameValue.trim(),
      });
    }
    setRenamingId(null);
    setRenameValue('');
    loadSessions();
  }

  async function handleDuplicate(sessionId: string) {
    await browser.runtime.sendMessage({ type: 'duplicate-session', sessionId });
    loadSessions();
  }

  async function handleExport() {
    const result = await browser.runtime.sendMessage({ type: 'export-sessions' });
    if (result.success) {
      const blob = new Blob([JSON.stringify(result.sessions, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tab-manager-sessions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const sessions = JSON.parse(text);
        await browser.runtime.sendMessage({
          type: 'import-sessions',
          sessions: Array.isArray(sessions) ? sessions : [sessions],
        });
        loadSessions();
      } catch {
        alert('Invalid session file');
      }
    };
    input.click();
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function totalTabs(session: Session) {
    return session.windows.reduce((sum, w) => sum + w.tabs.length, 0);
  }

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="manager">
        <div className="loading">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="manager">
      <header className="manager-header">
        <div className="manager-header-top">
          <h1>Tab Manager</h1>
          <div className="manager-header-actions">
            <button className="btn btn-primary" onClick={handleSaveCurrent}>
              Save Current Window
            </button>
            <button className="btn btn-secondary" onClick={handleSaveAll}>
              Save All Windows
            </button>
            <button className="btn btn-outline" onClick={handleExport}>
              Export
            </button>
            <button className="btn btn-outline" onClick={handleImport}>
              Import
            </button>
          </div>
        </div>
        <input
          type="text"
          className="search-input"
          placeholder="Search sessions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      <main className="manager-content">
        {filteredSessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h2>No sessions found</h2>
            <p>Save a session to get started.</p>
          </div>
        )}

        <div className="session-grid">
          {filteredSessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="card-header">
                {renamingId === session.id ? (
                  <input
                    type="text"
                    className="rename-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(session.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(session.id);
                      if (e.key === 'Escape') {
                        setRenamingId(null);
                        setRenameValue('');
                      }
                    }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <h3
                    className="session-title"
                    onDoubleClick={() => {
                      setRenamingId(session.id);
                      setRenameValue(session.name);
                    }}
                    title="Double-click to rename"
                  >
                    {session.name}
                  </h3>
                )}
                <span className="session-date">
                  {formatDate(session.createdAt)}
                </span>
              </div>

              <div className="card-stats">
                <span className="stat">
                  <strong>{totalTabs(session)}</strong> tab
                  {totalTabs(session) !== 1 ? 's' : ''}
                </span>
                <span className="stat">
                  <strong>{session.windows.length}</strong> window
                  {session.windows.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-sm"
                  onClick={() => handleRestore(session.id, false)}
                >
                  Open
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => handleRestore(session.id, true)}
                >
                  New Window
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => handleDuplicate(session.id)}
                >
                  Duplicate
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setRenamingId(session.id);
                    setRenameValue(session.name);
                  }}
                >
                  Rename
                </button>
                {deleteConfirmId === session.id ? (
                  <div className="confirm-delete">
                    <span>Delete?</span>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(session.id)}
                    >
                      Yes
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeleteConfirmId(session.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
