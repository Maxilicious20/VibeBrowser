/**
 * Session Manager - Save and restore browsing sessions
 */

import { BrowserSession } from '../common/types';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class SessionManager {
  private sessionsPath: string;
  private sessions: Map<string, BrowserSession> = new Map();

  constructor() {
    this.sessionsPath = path.join(app.getPath('userData'), 'sessions.json');
    this.loadSessions();
  }

  /**
   * Load sessions from disk
   */
  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionsPath)) {
        const data = fs.readFileSync(this.sessionsPath, 'utf-8');
        const sessionArray: BrowserSession[] = JSON.parse(data);
        sessionArray.forEach(session => {
          this.sessions.set(session.id, session);
        });
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  /**
   * Save sessions to disk
   */
  private saveSessions(): void {
    try {
      const sessionArray = Array.from(this.sessions.values());
      fs.writeFileSync(this.sessionsPath, JSON.stringify(sessionArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  /**
   * Save current session
   */
  saveSession(name: string, tabs: Array<{ url: string; title: string }>): BrowserSession {
    const sessionId = `session-${Date.now()}`;
    const session: BrowserSession = {
      id: sessionId,
      name: name,
      tabs: tabs,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();
    return session;
  }

  /**
   * Load a session
   */
  loadSession(sessionId: string): BrowserSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.lastModified - a.lastModified);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.saveSessions();
      return true;
    }
    return false;
  }

  /**
   * Update session (e.g., when tabs change)
   */
  updateSession(sessionId: string, tabs: Array<{ url: string; title: string }>): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tabs = tabs;
      session.lastModified = Date.now();
      this.saveSessions();
      return true;
    }
    return false;
  }

  /**
   * Get auto-save session (last window state)
   */
  getAutoSaveSession(): BrowserSession | null {
    const autoSave = Array.from(this.sessions.values()).find(s => s.name === '__autosave__');
    return autoSave || null;
  }

  /**
   * Save auto-save session
   */
  saveAutoSaveSession(tabs: Array<{ url: string; title: string }>): void {
    const existing = this.getAutoSaveSession();
    if (existing) {
      this.updateSession(existing.id, tabs);
    } else {
      this.saveSession('__autosave__', tabs);
    }
  }
}
