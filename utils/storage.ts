import type { Session } from './types';

const SESSIONS_KEY = 'sessions';

export async function getSessions(): Promise<Session[]> {
  const result = await browser.storage.local.get(SESSIONS_KEY);
  return (result[SESSIONS_KEY] as Session[]) ?? [];
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  const existing = sessions.findIndex(s => s.id === session.id);
  if (existing >= 0) {
    sessions[existing] = session;
  } else {
    sessions.push(session);
  }
  await browser.storage.local.set({ [SESSIONS_KEY]: sessions });
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await browser.storage.local.set({
    [SESSIONS_KEY]: sessions.filter(s => s.id !== id),
  });
}

export async function renameSession(id: string, name: string): Promise<void> {
  const sessions = await getSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.name = name;
    session.updatedAt = Date.now();
    await browser.storage.local.set({ [SESSIONS_KEY]: sessions });
  }
}
