import type { SavedTab, TabGroupData, WindowData, Session } from './types';

function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  const blocked = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];
  return !blocked.some(prefix => url.startsWith(prefix));
}

export async function captureWindow(windowId?: number): Promise<WindowData> {
  const tabs = await browser.tabs.query({ windowId: windowId ?? browser.windows.WINDOW_ID_CURRENT });

  const groupIds = new Set<number>();
  const savedTabs: SavedTab[] = [];

  for (const tab of tabs) {
    if (!isValidUrl(tab.url)) continue;
    savedTabs.push({
      url: tab.url!,
      title: tab.title ?? tab.url!,
      pinned: tab.pinned ?? false,
      groupId: tab.groupId && tab.groupId > 0 ? tab.groupId : undefined,
    });
    if (tab.groupId && tab.groupId > 0) {
      groupIds.add(tab.groupId);
    }
  }

  const groups: TabGroupData[] = [];
  for (const id of groupIds) {
    try {
      const group = await browser.tabGroups.get(id);
      groups.push({ id, title: group.title ?? '', color: group.color });
    } catch {
      // group may no longer exist
    }
  }

  return { tabs: savedTabs, groups };
}

export async function captureAllWindows(): Promise<WindowData[]> {
  const windows = await browser.windows.getAll({ populate: true });
  const results: WindowData[] = [];
  for (const win of windows) {
    if (win.id !== undefined) {
      results.push(await captureWindow(win.id));
    }
  }
  return results;
}

export async function restoreSession(session: Session, openInNewWindow: boolean): Promise<void> {
  for (const windowData of session.windows) {
    if (windowData.tabs.length === 0) continue;

    const targetWindow = openInNewWindow
      ? await browser.windows.create({ state: 'normal' })
      : await browser.windows.getCurrent();

    if (!targetWindow?.id) continue;

    const groupMapping = new Map<number, number>();

    for (const tabData of windowData.tabs) {
      try {
        const tab = await browser.tabs.create({
          windowId: targetWindow.id,
          url: tabData.url,
          pinned: tabData.pinned,
          active: false,
        });

        if (tabData.groupId && tab.id !== undefined) {
          if (!groupMapping.has(tabData.groupId)) {
            const newGroupId = await browser.tabs.group({ tabIds: [tab.id] });
            groupMapping.set(tabData.groupId, newGroupId);
          } else {
            const existingGroupId = groupMapping.get(tabData.groupId)!;
            await browser.tabs.group({ tabIds: [tab.id], groupId: existingGroupId });
          }
        }
      } catch {
        // skip tabs that fail to create
      }
    }

    for (const [oldId, newId] of groupMapping) {
      const original = windowData.groups.find(g => g.id === oldId);
      if (original) {
        try {
          await browser.tabGroups.update(newId, {
            title: original.title,
            color: original.color,
          });
        } catch {
          // ignore group update failures
        }
      }
    }
  }
}
