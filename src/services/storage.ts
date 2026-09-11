import { DEFAULT_USER_SETTINGS, GATE_SUBJECTS } from '../constants';
import { CalibrationProfile, DailySummary, EvaluationMetrics, FocusSession, FocusTimelineEvent, SubjectItem, UserSettings } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'ai_focus_timer_settings_v1',
  SESSIONS: 'ai_focus_timer_sessions_v1',
  TIMELINE: 'ai_focus_timer_timeline_v1',
  SUBJECTS: 'ai_focus_timer_subjects_v1',
  ACTIVE_SESSION: 'ai_focus_timer_active_session_v1',
  CALIBRATION: 'ai_focus_timer_calibration_v1',
  EVALUATION: 'ai_focus_timer_evaluation_v1'
};

// Helper for today's date string YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format seconds into readable format (e.g. 2h 14m 08s or 09:42:17)
export function formatTimeHoursMins(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDigitalClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {}
  return null;
}

export class StorageService {
  static getSettings(): UserSettings {
    try {
      const storage = getStorage();
      const raw = storage ? storage.getItem(STORAGE_KEYS.SETTINGS) : null;
      if (!raw) return DEFAULT_USER_SETTINGS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USER_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  }

  static saveSettings(settings: UserSettings): void {
    try {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to storage', e);
    }
  }

  static getCalibrationProfile(): CalibrationProfile | null {
    try {
      const storage = getStorage();
      const raw = storage ? storage.getItem(STORAGE_KEYS.CALIBRATION) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static saveCalibrationProfile(profile: CalibrationProfile): void {
    try {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save calibration profile', e);
    }
  }

  static getEvaluationMetrics(): EvaluationMetrics | null {
    try {
      const storage = getStorage();
      const raw = storage ? storage.getItem(STORAGE_KEYS.EVALUATION) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static saveEvaluationMetrics(metrics: EvaluationMetrics): void {
    try {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEYS.EVALUATION, JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save evaluation metrics', e);
    }
  }

  static getSubjects(): SubjectItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(GATE_SUBJECTS));
        return GATE_SUBJECTS;
      }
      return JSON.parse(raw);
    } catch {
      return GATE_SUBJECTS;
    }
  }

  static addSubject(name: string, category: string = 'Custom'): SubjectItem {
    const subjects = this.getSubjects();
    const newSubject: SubjectItem = {
      id: 'sub_' + Date.now(),
      name,
      category,
      isGateSubject: false
    };
    subjects.push(newSubject);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    return newSubject;
  }

  static getSessions(): FocusSession[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!raw) {
        const seeded = this.generateSampleSessions();
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveSession(session: FocusSession): void {
    try {
      const sessions = this.getSessions();
      const existingIdx = sessions.findIndex(s => s.id === session.id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        sessions.unshift(session);
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }

  static deleteSession(sessionId: string): void {
    try {
      const sessions = this.getSessions().filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to delete session', e);
    }
  }

  static saveSubject(subject: SubjectItem): void {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex(s => s.id === subject.id);
    if (idx >= 0) {
      subjects[idx] = subject;
    } else {
      subjects.push(subject);
    }
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }

  static hasCompletedOnboarding(): boolean {
    return localStorage.getItem('ai_focus_timer_onboarding_done') === 'true';
  }

  static setOnboardingComplete(): void {
    localStorage.setItem('ai_focus_timer_onboarding_done', 'true');
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.TIMELINE);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
      localStorage.removeItem(STORAGE_KEYS.CALIBRATION);
      localStorage.removeItem(STORAGE_KEYS.EVALUATION);
    } catch {}
  }

  static getTodaySessions(): FocusSession[] {
    const today = getTodayDateString();
    return this.getSessions().filter(s => {
      const sessionDate = new Date(s.startTime).toISOString().slice(0, 10);
      return sessionDate === today;
    });
  }

  static getTodaySummary(arg1?: number | FocusSession[], arg2?: number): DailySummary {
    let todaySessions: FocusSession[];
    let targetSeconds: number;

    if (Array.isArray(arg1)) {
      const today = getTodayDateString();
      todaySessions = arg1.filter(s => new Date(s.startTime).toISOString().slice(0, 10) === today);
      targetSeconds = arg2 || 12 * 3600;
    } else {
      todaySessions = this.getTodaySessions();
      targetSeconds = (arg1 || 12) * 3600;
    }

    let focusedSeconds = 0;
    let screenFocusedSeconds = 0;
    let paperFocusedSeconds = 0;
    let mixedFocusedSeconds = 0;
    let thinkingSeconds = 0;
    let uncertainSeconds = 0;
    let distractedSeconds = 0;
    let phoneDistractedSeconds = 0;
    let conversationSeconds = 0;
    let possibleSleepSeconds = 0;
    let awaySeconds = 0;
    let breakSeconds = 0;
    let unverifiedSeconds = 0;
    let longestSessionSeconds = 0;

    for (const session of todaySessions) {
      focusedSeconds += session.focusedSeconds;
      screenFocusedSeconds += session.screenFocusedSeconds || Math.round(session.focusedSeconds * 0.6);
      paperFocusedSeconds += session.paperFocusedSeconds || Math.round(session.focusedSeconds * 0.4);
      mixedFocusedSeconds += session.mixedFocusedSeconds || 0;
      thinkingSeconds += session.thinkingSeconds || 0;
      uncertainSeconds += session.uncertainSeconds || 0;
      distractedSeconds += session.distractedSeconds;
      phoneDistractedSeconds += session.phoneDistractedSeconds || 0;
      conversationSeconds += session.conversationSeconds || 0;
      possibleSleepSeconds += session.possibleSleepSeconds || 0;
      awaySeconds += session.awaySeconds;
      breakSeconds += session.breakSeconds;
      unverifiedSeconds += session.unverifiedSeconds || 0;
      if (session.focusedSeconds > longestSessionSeconds) {
        longestSessionSeconds = session.focusedSeconds;
      }
    }

    const totalActiveTime = focusedSeconds + distractedSeconds + awaySeconds;
    const efficiency = totalActiveTime > 0 ? (focusedSeconds / totalActiveTime) * 100 : 0;
    const productivityScore = targetSeconds > 0 ? Math.min(100, (focusedSeconds / targetSeconds) * 100) : 0;
    const averageSessionSeconds = todaySessions.length > 0 ? Math.round(focusedSeconds / todaySessions.length) : 0;

    return {
      date: getTodayDateString(),
      targetSeconds,
      focusedSeconds,
      screenFocusedSeconds,
      paperFocusedSeconds,
      mixedFocusedSeconds,
      thinkingSeconds,
      uncertainSeconds,
      distractedSeconds,
      phoneDistractedSeconds,
      conversationSeconds,
      possibleSleepSeconds,
      awaySeconds,
      breakSeconds,
      unverifiedSeconds,
      sessionCount: todaySessions.length,
      longestSessionSeconds,
      averageSessionSeconds,
      efficiency,
      productivityScore
    };
  }

  static saveTimelineEvents(events: FocusTimelineEvent[]): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TIMELINE);
      const existing: FocusTimelineEvent[] = raw ? JSON.parse(raw) : [];
      // Keep last 3000 timeline events to optimize storage
      const combined = [...existing, ...events].slice(-3000);
      localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(combined));
    } catch (e) {
      console.error('Failed to save timeline events', e);
    }
  }

  static getTimelineEvents(): FocusTimelineEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TIMELINE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.TIMELINE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.CALIBRATION);
    localStorage.removeItem(STORAGE_KEYS.EVALUATION);
  }

  static exportAsJSON(): string {
    const data = {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      calibration: this.getCalibrationProfile(),
      subjects: this.getSubjects(),
      sessions: this.getSessions(),
      timeline: this.getTimelineEvents()
    };
    return JSON.stringify(data, null, 2);
  }

  static exportAsCSV(): string {
    const sessions = this.getSessions();
    const headers = [
      'ID',
      'Date',
      'Subject',
      'Topic',
      'Mode',
      'Medium',
      'Target (min)',
      'Total Verified Focus (min)',
      'Screen Focus (min)',
      'Paper Focus (min)',
      'Mixed Focus (min)',
      'Distraction (min)',
      'Away (min)',
      'Unverified (min)',
      'Efficiency (%)',
      'Average Focus Score',
      'Status'
    ];

    const rows = sessions.map(s => {
      const dateStr = new Date(s.startTime).toLocaleDateString();
      const targetMin = Math.round(s.targetSeconds / 60);
      const focusMin = Math.round(s.focusedSeconds / 60);
      const screenMin = Math.round((s.screenFocusedSeconds || (s.focusedSeconds * 0.6)) / 60);
      const paperMin = Math.round((s.paperFocusedSeconds || (s.focusedSeconds * 0.4)) / 60);
      const mixedMin = Math.round((s.mixedFocusedSeconds || 0) / 60);
      const distMin = Math.round(s.distractedSeconds / 60);
      const awayMin = Math.round(s.awaySeconds / 60);
      const unverifiedMin = Math.round((s.unverifiedSeconds || 0) / 60);
      const eff = (s.focusedSeconds + s.distractedSeconds + s.awaySeconds) > 0
        ? Math.round((s.focusedSeconds / (s.focusedSeconds + s.distractedSeconds + s.awaySeconds)) * 100)
        : 0;

      return [
        s.id,
        `"${dateStr}"`,
        `"${s.subject}"`,
        `"${s.topic}"`,
        `"${s.mode}"`,
        `"${s.studyMedium || 'Screen Study'}"`,
        targetMin,
        focusMin,
        screenMin,
        paperMin,
        mixedMin,
        distMin,
        awayMin,
        unverifiedMin,
        eff,
        Math.round(s.averageFocusScore),
        s.status
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  static importFromJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      if (parsed.calibration) localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(parsed.calibration));
      if (parsed.subjects) localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(parsed.subjects));
      if (parsed.sessions) localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(parsed.sessions));
      if (parsed.timeline) localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(parsed.timeline));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  // Generate realistic initial sessions for authentic experience
  private static generateSampleSessions(): FocusSession[] {
    const now = Date.now();
    
    return [
      {
        id: 'sess_1',
        subject: 'Algorithms',
        topic: 'Dynamic Programming (DP on Trees)',
        goal: 'Solve 6 Hard PYQs with verified focus',
        mode: 'Deep Focus',
        studyMedium: 'Mixed Study',
        startTime: now - (2 * 3600 * 1000 + 15 * 60 * 1000),
        endTime: now - (15 * 60 * 1000),
        targetSeconds: 2 * 3600,
        focusedSeconds: 6420, // 1h 47m
        screenFocusedSeconds: 3800,
        paperFocusedSeconds: 2620,
        mixedFocusedSeconds: 1200,
        warningSeconds: 240,
        uncertainSeconds: 180,
        distractedSeconds: 480, // 8m
        awaySeconds: 180, // 3m
        breakSeconds: 300,
        unverifiedSeconds: 0,
        elapsedSeconds: 7200,
        averageFocusScore: 89,
        peakFocusScore: 98,
        distractionCount: 3,
        status: 'COMPLETED'
      },
      {
        id: 'sess_2',
        subject: 'Database Management Systems (DBMS)',
        topic: 'B+ Tree Indexing & Transactions',
        goal: 'Solve 10 GATE PYQs on Paper',
        mode: 'PYQ Practice',
        studyMedium: 'Paper / PYQ Study',
        startTime: now - (5 * 3600 * 1000),
        endTime: now - (3 * 3600 * 1000),
        targetSeconds: 2 * 3600,
        focusedSeconds: 6600,
        screenFocusedSeconds: 600,
        paperFocusedSeconds: 6000,
        mixedFocusedSeconds: 0,
        warningSeconds: 180,
        uncertainSeconds: 120,
        distractedSeconds: 320,
        awaySeconds: 280,
        breakSeconds: 600,
        unverifiedSeconds: 0,
        elapsedSeconds: 7200,
        averageFocusScore: 92,
        peakFocusScore: 99,
        distractionCount: 2,
        status: 'COMPLETED'
      }
    ];
  }
}
