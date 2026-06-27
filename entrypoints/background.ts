import { getSessions, saveSession, deleteSession, renameSession } from '@/utils/storage';
import { captureWindow, captureAllWindows, restoreSession } from '@/utils/tab-operations';
import type { Session } from '@/utils/types';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    switch (message.type) {
      case 'save-session': {
        const name = message.name || `Session ${new Date().toLocaleString()}`;
        (async () => {
          try {
            const windowsData = message.allWindows
              ? await captureAllWindows()
              : [await captureWindow()];
            const session: Session = {
              id: crypto.randomUUID(),
              name,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              windows: windowsData,
            };
            await saveSession(session);
            sendResponse({ success: true, session });
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }

      case 'get-sessions': {
        getSessions()
          .then(sessions => sendResponse({ success: true, sessions }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      case 'restore-session': {
        (async () => {
          try {
            const sessions = await getSessions();
            const session = sessions.find(s => s.id === message.sessionId);
            if (!session) {
              sendResponse({ success: false, error: 'Session not found' });
              return;
            }
            await restoreSession(session, message.newWindow ?? false);
            sendResponse({ success: true });
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }

      case 'rename-session': {
        renameSession(message.sessionId, message.name)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      case 'delete-session': {
        deleteSession(message.sessionId)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      case 'duplicate-session': {
        (async () => {
          try {
            const sessions = await getSessions();
            const session = sessions.find(s => s.id === message.sessionId);
            if (!session) {
              sendResponse({ success: false, error: 'Session not found' });
              return;
            }
            const newSession: Session = {
              ...session,
              id: crypto.randomUUID(),
              name: `${session.name} (copy)`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await saveSession(newSession);
            sendResponse({ success: true, session: newSession });
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }

      case 'export-sessions': {
        getSessions()
          .then(sessions => sendResponse({ success: true, sessions }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      case 'import-sessions': {
        (async () => {
          try {
            const sessions = message.sessions as Session[];
            for (const s of sessions) {
              await saveSession(s);
            }
            sendResponse({ success: true });
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }
    }
  });
});
