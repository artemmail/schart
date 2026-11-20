import { Injectable } from '@angular/core';
import { ChartSettings } from '../models/ChartSettings';

export interface ChartWorkspace {
  market?: number;
  settings?: ChartSettings;
  drawerOpen: boolean;
  panels: string[];
}

/** Chart parameters sync through favorites; panel layout stays on this device. */
@Injectable({ providedIn: 'root' })
export class ChartWorkspaceService {
  private key(userId: string, favoriteId: string): string { return 'stockchart.workspace.v1.' + userId + '.' + favoriteId; }
  save(userId: string, favoriteId: string, workspace: ChartWorkspace): boolean {
    try { localStorage.setItem(this.key(userId, favoriteId), JSON.stringify(workspace)); return true; } catch { return false; }
  }
  load(userId: string, favoriteId: string): ChartWorkspace | null {
    try {
      const value = JSON.parse(localStorage.getItem(this.key(userId, favoriteId)) ?? 'null');
      return value && Array.isArray(value.panels) ? value : null;
    } catch { return null; }
  }
  remove(userId: string, favoriteId: string): void {
    try { localStorage.removeItem(this.key(userId, favoriteId)); } catch {}
  }
}
