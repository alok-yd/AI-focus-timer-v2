import { ActivityEventLog, ActivityType, FocusConfidenceVector, FocusState, StateTransitionLog } from '../../types';

export class ContextMemory {
  private recentActivities: Array<{ activity: ActivityType; timestamp: number }> = [];
  private recentStates: Array<{ state: FocusState; timestamp: number }> = [];
  private transitionLogs: StateTransitionLog[] = [];
  private activityEvents: ActivityEventLog[] = [];
  private currentActivityStart: { activity: ActivityType; timestamp: number } | null = null;
  private currentStateStart: { state: FocusState; timestamp: number } | null = null;

  recordActivity(activity: ActivityType, now: number = Date.now()): void {
    this.recentActivities.push({ activity, timestamp: now });
    if (this.recentActivities.length > 50) this.recentActivities.shift();

    // Group into discrete activity events
    if (!this.currentActivityStart) {
      this.currentActivityStart = { activity, timestamp: now };
    } else if (this.currentActivityStart.activity !== activity) {
      const durationSeconds = Math.max(1, Math.round((now - this.currentActivityStart.timestamp) / 1000));
      this.activityEvents.push({
        id: 'act_' + now + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: this.currentActivityStart.timestamp,
        activity: this.currentActivityStart.activity,
        durationSeconds
      });
      if (this.activityEvents.length > 150) this.activityEvents.shift();
      this.currentActivityStart = { activity, timestamp: now };
    }
  }

  recordState(state: FocusState, now: number = Date.now()): void {
    this.recentStates.push({ state, timestamp: now });
    if (this.recentStates.length > 50) this.recentStates.shift();

    if (!this.currentStateStart) {
      this.currentStateStart = { state, timestamp: now };
    } else if (this.currentStateStart.state !== state) {
      this.currentStateStart = { state, timestamp: now };
    }
  }

  recordTransition(
    oldState: FocusState,
    newState: FocusState,
    focusScore: number,
    reason: string,
    activity?: ActivityType,
    confidenceVector?: FocusConfidenceVector,
    now: number = Date.now()
  ): StateTransitionLog {
    const log: StateTransitionLog = {
      id: 'trans_' + now + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: now,
      oldState,
      newState,
      activity,
      focusScore,
      confidenceVector,
      reason
    };

    this.transitionLogs.push(log);
    if (this.transitionLogs.length > 100) {
      this.transitionLogs.shift();
    }
    return log;
  }

  getRecentActivity(): ActivityType | undefined {
    return this.recentActivities[this.recentActivities.length - 1]?.activity;
  }

  getRecentState(): FocusState | undefined {
    return this.recentStates[this.recentStates.length - 1]?.state;
  }

  wasRecentlyInPaperFocus(withinSeconds: number = 180, now: number = Date.now()): boolean {
    return this.recentStates.some(
      s => (s.state === 'FOCUSED_PAPER' || s.state === 'THINKING') && (now - s.timestamp) <= withinSeconds * 1000
    );
  }

  wasRecentlyInScreenFocus(withinSeconds: number = 180, now: number = Date.now()): boolean {
    return this.recentStates.some(
      s => s.state === 'FOCUSED_SCREEN' && (now - s.timestamp) <= withinSeconds * 1000
    );
  }

  getTimeInCurrentState(now: number = Date.now()): number {
    if (!this.currentStateStart) return 0;
    return Math.max(0, Math.floor((now - this.currentStateStart.timestamp) / 1000));
  }

  getTransitionLogs(): StateTransitionLog[] {
    return [...this.transitionLogs];
  }

  getActivityEvents(): ActivityEventLog[] {
    return [...this.activityEvents];
  }

  reset(): void {
    this.recentActivities = [];
    this.recentStates = [];
    this.transitionLogs = [];
    this.activityEvents = [];
    this.currentActivityStart = null;
    this.currentStateStart = null;
  }
}

export const contextMemory = new ContextMemory();
