export interface SavedTab {
  url: string;
  title: string;
  pinned: boolean;
  groupId?: number;
}

export type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

export interface TabGroupData {
  id: number;
  title: string;
  color: TabGroupColor;
}

export interface WindowData {
  tabs: SavedTab[];
  groups: TabGroupData[];
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  windows: WindowData[];
}
