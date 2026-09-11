import { FocusEngine, FocusEngineOutput } from './focusEngine';
import { FocusMode, FocusSession, FocusState, FocusTimelineEvent, isFocusedState, StudyMedium } from '../types';
import { StorageService } from './storage';
import { soundFx } from './audio';

export interface TimerTickData {
  state: FocusState;
  elapsedSeconds: number;
  focusedSeconds: number;
  screenFocusedSeconds: number;
  paperFocusedSeconds: number;
  mixedFocusedSeconds: number;
  thinkingSeconds: number;
  uncertainSeconds: number;
  unverifiedSeconds: number;
  remainingTargetSeconds: number;
  distractedSeconds: number;
  phoneSeconds: number;
  conversationSeconds: number;
  sleepSeconds: number;
  awaySeconds: number;
  breakSeconds: number;
  efficiency: number;
  currentScore: number;
  averageScore: number;
  peakScore: number;
  distractionCount: number;
  targetSeconds: number;
  activeSubject: string;
  activeTopic: string;
  activeGoal: string;
  activeMode: FocusMode;
  activeMedium: StudyMedium;
  isCompleted: boolean;
  stateExplanation?: string;
  telemetry?: FocusEngineOutput['telemetry'];
}

export type TimerTickCallback = (data: TimerTickData) => void;

export class TimerEngine {
  private focusEngine: FocusEngine;
  private intervalId: number | null = null;
  private callbacks: Set<TimerTickCallback> = new Set();

  // Active Session State
  private activeSessionId: string | null = null;
  private subject: string = 'Algorithms';
  private topic: string = 'Dynamic Programming';
  private goal: string = 'Solve 5 PYQ problems with verified focus';
  private mode: FocusMode = 'Deep Focus';
  private medium: StudyMedium = 'Screen Study';
  private targetSeconds: number = 7200; // 2 hours default
  private sessionStartTime: number = 0;

  // Time accumulators (in milliseconds for high precision)
  private accumulatedFocusedMs: number = 0;
  private accumulatedScreenFocusedMs: number = 0;
  private accumulatedPaperFocusedMs: number = 0;
  private accumulatedMixedFocusedMs: number = 0;
  private accumulatedThinkingMs: number = 0;
  private accumulatedUncertainMs: number = 0;
  private accumulatedUnverifiedMs: number = 0;
  private accumulatedWarningMs: number = 0;
  private accumulatedDistractedMs: number = 0;
  private accumulatedPhoneMs: number = 0;
  private accumulatedConversationMs: number = 0;
  private accumulatedSleepMs: number = 0;
  private accumulatedAwayMs: number = 0;
  private accumulatedBreakMs: number = 0;
  private lastTickTimestamp: number = 0;

  // Scores & metrics
  private scoresList: number[] = [];
  private peakScore: number = 0;
  private distractionCount: number = 0;
  private previousState: FocusState = 'IDLE';
  private currentStateExplanation: string = '';

  // Timeline events queue
  private timelineBuffer: FocusTimelineEvent[] = [];
  private lastTimelineLog: number = 0;

  constructor(focusEngine: FocusEngine) {
    this.focusEngine = focusEngine;
    this.medium = focusEngine.getStudyMedium();
    this.focusEngine.subscribe(this.handleFocusEngineOutput);
  }

  subscribe(callback: TimerTickCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  setStudyMedium(medium: StudyMedium): void {
    this.medium = medium;
    this.focusEngine.setStudyMedium(medium);
    this.emitCurrentTick();
  }

  getStudyMedium(): StudyMedium {
    return this.medium;
  }

  startSession(
    subject: string,
    topic: string,
    targetSeconds: number,
    mode: FocusMode = 'Deep Focus',
    goal: string = '',
    medium?: StudyMedium
  ): void {
    const now = Date.now();
    this.activeSessionId = 'sess_' + now;
    this.subject = subject;
    this.topic = topic;
    this.targetSeconds = targetSeconds;
    this.mode = mode;
    if (medium) {
      this.medium = medium;
      this.focusEngine.setStudyMedium(medium);
    } else {
      this.medium = this.focusEngine.getStudyMedium();
    }
    this.goal = goal;
    this.sessionStartTime = now;
    this.lastTickTimestamp = now;

    this.accumulatedFocusedMs = 0;
    this.accumulatedScreenFocusedMs = 0;
    this.accumulatedPaperFocusedMs = 0;
    this.accumulatedMixedFocusedMs = 0;
    this.accumulatedThinkingMs = 0;
    this.accumulatedUncertainMs = 0;
    this.accumulatedUnverifiedMs = 0;
    this.accumulatedWarningMs = 0;
    this.accumulatedDistractedMs = 0;
    this.accumulatedPhoneMs = 0;
    this.accumulatedConversationMs = 0;
    this.accumulatedSleepMs = 0;
    this.accumulatedAwayMs = 0;
    this.accumulatedBreakMs = 0;
    this.scoresList = [];
    this.peakScore = 0;
    this.distractionCount = 0;

    let initialFocusedState: FocusState = 'FOCUSED_SCREEN';
    if (this.medium === 'Paper / PYQ Study') {
      initialFocusedState = 'FOCUSED_PAPER';
    } else if (this.medium === 'Mixed Study') {
      initialFocusedState = 'FOCUSED_MIXED';
    }

    this.previousState = initialFocusedState;
    this.focusEngine.setState(initialFocusedState, 'Session initiated');

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.intervalId = window.setInterval(this.tick, 500);

    soundFx.playFocusRestored();
    this.emitCurrentTick();
  }

  pauseSession(): void {
    this.focusEngine.setState('PAUSED', 'User paused session');
    soundFx.playAutoPaused();
    this.emitCurrentTick();
  }

  resumeSession(): void {
    this.lastTickTimestamp = Date.now();
    let resumeState: FocusState = 'FOCUSED_SCREEN';
    if (this.medium === 'Paper / PYQ Study') {
      resumeState = 'FOCUSED_PAPER';
    } else if (this.medium === 'Mixed Study') {
      resumeState = 'FOCUSED_MIXED';
    }
    this.focusEngine.setState(resumeState, 'User resumed session');
    soundFx.playFocusRestored();
    this.emitCurrentTick();
  }

  continueWithoutVerification(): void {
    this.lastTickTimestamp = Date.now();
    this.focusEngine.setState('UNVERIFIED', 'User continued without camera verification');
    this.emitCurrentTick();
  }

  startBreak(durationMinutes: number = 5): void {
    this.focusEngine.setState('BREAK', `User started ${durationMinutes}m break`);
    this.emitCurrentTick();
  }

  endBreak(): void {
    soundFx.playBreakEnd();
    this.resumeSession();
  }

  stopSession(): FocusSession | null {
    if (!this.activeSessionId) return null;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const endTime = Date.now();
    const focusedSec = Math.round(this.accumulatedFocusedMs / 1000);
    const screenFocusedSec = Math.round(this.accumulatedScreenFocusedMs / 1000);
    const paperFocusedSec = Math.round(this.accumulatedPaperFocusedMs / 1000);
    const mixedFocusedSec = Math.round(this.accumulatedMixedFocusedMs / 1000);
    const thinkingSec = Math.round(this.accumulatedThinkingMs / 1000);
    const uncertainSec = Math.round(this.accumulatedUncertainMs / 1000);
    const unverifiedSec = Math.round(this.accumulatedUnverifiedMs / 1000);
    const distractedSec = Math.round(this.accumulatedDistractedMs / 1000);
    const phoneSec = Math.round(this.accumulatedPhoneMs / 1000);
    const convSec = Math.round(this.accumulatedConversationMs / 1000);
    const sleepSec = Math.round(this.accumulatedSleepMs / 1000);
    const awaySec = Math.round(this.accumulatedAwayMs / 1000);
    const breakSec = Math.round(this.accumulatedBreakMs / 1000);
    const warningSec = Math.round(this.accumulatedWarningMs / 1000);
    const elapsedSec = Math.round((endTime - this.sessionStartTime) / 1000);

    const avgScore = this.scoresList.length > 0
      ? Math.round(this.scoresList.reduce((a, b) => a + b, 0) / this.scoresList.length)
      : 80;

    const completedSession: FocusSession = {
      id: this.activeSessionId,
      subject: this.subject,
      topic: this.topic,
      goal: this.goal,
      mode: this.mode,
      studyMedium: this.medium,
      startTime: this.sessionStartTime,
      endTime,
      targetSeconds: this.targetSeconds,
      focusedSeconds: focusedSec,
      screenFocusedSeconds: screenFocusedSec,
      paperFocusedSeconds: paperFocusedSec,
      mixedFocusedSeconds: mixedFocusedSec,
      thinkingSeconds: thinkingSec,
      uncertainSeconds: uncertainSec,
      unverifiedSeconds: unverifiedSec,
      warningSeconds: warningSec,
      distractedSeconds: distractedSec,
      phoneDistractedSeconds: phoneSec,
      conversationSeconds: convSec,
      possibleSleepSeconds: sleepSec,
      awaySeconds: awaySec,
      breakSeconds: breakSec,
      elapsedSeconds: elapsedSec,
      averageFocusScore: avgScore,
      peakFocusScore: Math.max(this.peakScore, avgScore),
      distractionCount: this.distractionCount,
      status: focusedSec >= this.targetSeconds ? 'COMPLETED' : 'STOPPED',
      transitionLogs: this.focusEngine.getTransitionLogs(),
      activityEvents: this.focusEngine.getActivityEvents()
    };

    StorageService.saveSession(completedSession);
    if (this.timelineBuffer.length > 0) {
      StorageService.saveTimelineEvents(this.timelineBuffer);
      this.timelineBuffer = [];
    }

    this.focusEngine.setState('IDLE', 'Session ended');
    this.activeSessionId = null;
    this.emitCurrentTick();

    return completedSession;
  }

  private handleFocusEngineOutput = (output: FocusEngineOutput) => {
    if (!this.activeSessionId) return;

    this.currentStateExplanation = output.stateExplanation;

    // Track score distribution
    if (output.score > 0) {
      this.scoresList.push(output.score);
      if (output.score > this.peakScore) {
        this.peakScore = output.score;
      }
    }

    const curr = output.state;
    const prev = this.previousState;

    // Transitions between focused states (SCREEN, PAPER, MIXED) are continuous and do not fragment
    const isBothFocused = isFocusedState(curr) && isFocusedState(prev);

    if (curr !== prev && !isBothFocused) {
      if (isFocusedState(curr) && (prev === 'PAUSED' || prev === 'AWAY' || prev === 'UNCERTAIN' || prev === 'WARNING')) {
        soundFx.playFocusRestored();
      } else if (curr === 'WARNING' && isFocusedState(prev)) {
        soundFx.playWarning();
        this.distractionCount++;
      } else if (curr === 'PAUSED' && prev !== 'PAUSED') {
        soundFx.playAutoPaused();
      } else if (curr === 'AWAY' && prev !== 'AWAY') {
        soundFx.playAutoPaused();
      }
    }
    this.previousState = curr;
  };

  private tick = () => {
    if (!this.activeSessionId) return;

    const now = Date.now();
    const deltaMs = Math.max(0, now - this.lastTickTimestamp);
    this.lastTickTimestamp = now;

    const state = this.focusEngine.getState();

    switch (state) {
      case 'FOCUSED':
      case 'FOCUSED_SCREEN':
        this.accumulatedFocusedMs += deltaMs;
        this.accumulatedScreenFocusedMs += deltaMs;
        break;
      case 'FOCUSED_PAPER':
        this.accumulatedFocusedMs += deltaMs;
        this.accumulatedPaperFocusedMs += deltaMs;
        break;
      case 'FOCUSED_MIXED':
        this.accumulatedFocusedMs += deltaMs;
        this.accumulatedMixedFocusedMs += deltaMs;
        break;
      case 'THINKING':
        // Thinking counts 100% towards verified focus time!
        this.accumulatedFocusedMs += deltaMs;
        this.accumulatedThinkingMs += deltaMs;
        if (this.medium === 'Paper / PYQ Study') {
          this.accumulatedPaperFocusedMs += deltaMs;
        } else if (this.medium === 'Mixed Study') {
          this.accumulatedMixedFocusedMs += deltaMs;
        } else {
          this.accumulatedScreenFocusedMs += deltaMs;
        }
        break;
      case 'UNCERTAIN':
      case 'WARNING':
        // UNCERTAIN means the system lacks definitive evidence: verified focus continues!
        this.accumulatedFocusedMs += deltaMs;
        this.accumulatedUncertainMs += deltaMs;
        if (this.medium === 'Paper / PYQ Study') {
          this.accumulatedPaperFocusedMs += deltaMs;
        } else if (this.medium === 'Mixed Study') {
          this.accumulatedMixedFocusedMs += deltaMs;
        } else {
          this.accumulatedScreenFocusedMs += deltaMs;
        }
        break;
      case 'UNVERIFIED':
        // Unverified time recorded truthfully without adding to verified focus
        this.accumulatedUnverifiedMs += deltaMs;
        break;
      case 'PHONE_USE':
        this.accumulatedDistractedMs += deltaMs;
        this.accumulatedPhoneMs += deltaMs;
        break;
      case 'CONVERSATION':
        this.accumulatedDistractedMs += deltaMs;
        this.accumulatedConversationMs += deltaMs;
        break;
      case 'POSSIBLE_SLEEP':
        this.accumulatedDistractedMs += deltaMs;
        this.accumulatedSleepMs += deltaMs;
        break;
      case 'PAUSED':
      case 'DISTRACTED':
        this.accumulatedDistractedMs += deltaMs;
        break;
      case 'AWAY':
        this.accumulatedAwayMs += deltaMs;
        break;
      case 'BREAK':
        this.accumulatedBreakMs += deltaMs;
        break;
      default:
        break;
    }

    // Check target reached
    const currentFocusedSec = Math.floor(this.accumulatedFocusedMs / 1000);
    if (currentFocusedSec >= this.targetSeconds && this.targetSeconds > 0) {
      soundFx.playTargetReached();
    }

    // Sample timeline every 5 seconds
    if (now - this.lastTimelineLog >= 5000) {
      this.lastTimelineLog = now;
      const engineOut = this.focusEngine.getCurrentOutput();
      const evt: FocusTimelineEvent = {
        id: 'tl_' + now,
        sessionId: this.activeSessionId,
        timestamp: now,
        state,
        focusScore: engineOut.score,
        facePresent: engineOut.facePresent,
        headYaw: engineOut.telemetry?.headYaw ?? 0,
        headPitch: engineOut.telemetry?.headPitch ?? 0,
        eyeOpen: true,
        activeApp: 'Study Environment',
        handActivity: engineOut.telemetry?.handActivity,
        activity: engineOut.activity
      };
      this.timelineBuffer.push(evt);
    }

    this.emitCurrentTick();
  };

  private emitCurrentTick(): void {
    const focusedSec = Math.floor(this.accumulatedFocusedMs / 1000);
    const screenFocusedSec = Math.floor(this.accumulatedScreenFocusedMs / 1000);
    const paperFocusedSec = Math.floor(this.accumulatedPaperFocusedMs / 1000);
    const mixedFocusedSec = Math.floor(this.accumulatedMixedFocusedMs / 1000);
    const thinkingSec = Math.floor(this.accumulatedThinkingMs / 1000);
    const uncertainSec = Math.floor(this.accumulatedUncertainMs / 1000);
    const unverifiedSec = Math.floor(this.accumulatedUnverifiedMs / 1000);
    const distractedSec = Math.floor(this.accumulatedDistractedMs / 1000);
    const phoneSec = Math.floor(this.accumulatedPhoneMs / 1000);
    const convSec = Math.floor(this.accumulatedConversationMs / 1000);
    const sleepSec = Math.floor(this.accumulatedSleepMs / 1000);
    const awaySec = Math.floor(this.accumulatedAwayMs / 1000);
    const breakSec = Math.floor(this.accumulatedBreakMs / 1000);

    const now = Date.now();
    const elapsedSec = this.sessionStartTime > 0
      ? Math.floor((now - this.sessionStartTime) / 1000)
      : 0;

    const remaining = Math.max(0, this.targetSeconds - focusedSec);
    const totalActive = focusedSec + distractedSec + awaySec;
    const efficiency = totalActive > 0 ? Math.round((focusedSec / totalActive) * 100) : 100;

    const engineOut = this.focusEngine.getCurrentOutput();
    const avgScore = this.scoresList.length > 0
      ? Math.round(this.scoresList.reduce((a, b) => a + b, 0) / this.scoresList.length)
      : engineOut.score;

    const tickPayload: TimerTickData = {
      state: this.focusEngine.getState(),
      elapsedSeconds: elapsedSec,
      focusedSeconds: focusedSec,
      screenFocusedSeconds: screenFocusedSec,
      paperFocusedSeconds: paperFocusedSec,
      mixedFocusedSeconds: mixedFocusedSec,
      thinkingSeconds: thinkingSec,
      uncertainSeconds: uncertainSec,
      unverifiedSeconds: unverifiedSec,
      remainingTargetSeconds: remaining,
      distractedSeconds: distractedSec,
      phoneSeconds: phoneSec,
      conversationSeconds: convSec,
      sleepSeconds: sleepSec,
      awaySeconds: awaySec,
      breakSeconds: breakSec,
      efficiency,
      currentScore: engineOut.score,
      averageScore: avgScore,
      peakScore: Math.max(this.peakScore, engineOut.score),
      distractionCount: this.distractionCount,
      targetSeconds: this.targetSeconds,
      activeSubject: this.subject,
      activeTopic: this.topic,
      activeGoal: this.goal,
      activeMode: this.mode,
      activeMedium: this.medium,
      isCompleted: focusedSec >= this.targetSeconds && this.targetSeconds > 0,
      stateExplanation: this.currentStateExplanation || engineOut.stateExplanation,
      telemetry: engineOut.telemetry
    };

    this.callbacks.forEach(cb => cb(tickPayload));
  }
}
