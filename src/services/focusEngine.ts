import { DEFAULT_FOCUS_SETTINGS } from '../constants';
import {
  ActivityData,
  FocusEngineSettings,
  FocusState,
  StateTransitionLog,
  StudyMedium,
  TemporalObservation,
  UserSettings,
  VisionData
} from '../types';
import { calibrationEngine } from './calibrationEngine';

export interface FocusEngineOutput {
  state: FocusState;
  score: number;
  rawScore: number;
  facePresent: boolean;
  distractionReason?: string;
  stateExplanation: string;
  isGracePeriodActive: boolean;
  graceSecondsRemaining: number;
  returnConfirmationRemaining: number;
  signalBreakdown: {
    faceScore: number;
    headPoseScore: number;
    eyeGazeScore: number;
    activityScore: number;
    appContextScore: number;
    deskActivityScore?: number;
    postureStableScore?: number;
    lightingScore?: number;
  };
  telemetry?: {
    headPitch: number;
    headYaw: number;
    gazeScore: number;
    handActivity: boolean;
    bodyPostureStable: boolean;
    keyboardActive: boolean;
    mouseActive: boolean;
    idleSeconds: number;
    studyMedium: StudyMedium;
    lightingLevel?: string;
    faceCount?: number;
  };
  recentTransitions?: StateTransitionLog[];
}

export type FocusEngineCallback = (output: FocusEngineOutput) => void;

export class FocusEngine {
  private settings: FocusEngineSettings;
  private currentState: FocusState = 'IDLE';
  private smoothedScore: number = 85;
  private rollingObservations: TemporalObservation[] = [];
  private transitionLogs: StateTransitionLog[] = [];

  // Timers and counters
  private distractionStartTime: number | null = null;
  private awayStartTime: number | null = null;
  private returnFocusStartTime: number | null = null;
  
  // Last known signals
  private lastVision: VisionData = {
    facePresent: true,
    confidence: 0.9,
    headYaw: 0,
    headPitch: -4,
    headRoll: 0,
    eyeOpen: true,
    gazeScore: 0.9,
    handActivity: false,
    bodyPostureStable: true,
    deskActivityScore: 0.2,
    isLookingDown: false,
    lightingLevel: 'normal',
    lightingScore: 0.65,
    faceCount: 1,
    cameraHealthy: true,
    timestamp: Date.now()
  };

  private lastActivity: ActivityData = {
    keyboardActive: false,
    mouseActive: false,
    idleSeconds: 0,
    activeApp: 'Visual Studio Code',
    isWindowFocused: true,
    lastActivityTimestamp: Date.now()
  };

  private callbacks: Set<FocusEngineCallback> = new Set();

  constructor(settings: FocusEngineSettings = DEFAULT_FOCUS_SETTINGS) {
    this.settings = settings;
  }

  getStudyMedium(): StudyMedium {
    return this.settings.studyMedium || 'Screen Study';
  }

  setStudyMedium(medium: StudyMedium): void {
    this.settings.studyMedium = medium;
    this.evaluate();
  }

  updateSettings(newSettings: FocusEngineSettings | UserSettings): void {
    if ('focusSettings' in newSettings) {
      this.settings = {
        ...newSettings.focusSettings,
        studyMedium: newSettings.studyMedium ?? newSettings.focusSettings.studyMedium,
        focusThreshold: newSettings.focusThreshold ?? newSettings.focusSettings.focusThreshold,
        warningThreshold: newSettings.warningThreshold ?? newSettings.focusSettings.warningThreshold,
        distractionGraceSeconds: newSettings.distractionGracePeriodSeconds ?? newSettings.focusSettings.distractionGraceSeconds,
        returnConfirmationSeconds: newSettings.returnConfirmationSeconds ?? newSettings.focusSettings.returnConfirmationSeconds,
        awayThresholdSeconds: newSettings.awayThresholdSeconds ?? newSettings.focusSettings.awayThresholdSeconds,
        paperHeadDownToleranceSeconds: newSettings.paperHeadDownToleranceSeconds ?? newSettings.focusSettings.paperHeadDownToleranceSeconds,
        studyApps: newSettings.studyApplications ?? newSettings.focusSettings.studyApps,
        distractingApps: newSettings.distractingApplications ?? newSettings.focusSettings.distractingApps
      };
    } else {
      this.settings = newSettings;
    }
    this.evaluate();
  }

  getTransitionLogs(): StateTransitionLog[] {
    return [...this.transitionLogs];
  }

  getCurrentOutput(): FocusEngineOutput {
    const { totalScore, signals, reason, explanation } = this.calculateScore();
    return {
      state: this.currentState,
      score: this.smoothedScore,
      rawScore: totalScore,
      facePresent: this.lastVision.facePresent,
      distractionReason: reason,
      stateExplanation: explanation,
      isGracePeriodActive: false,
      graceSecondsRemaining: 0,
      returnConfirmationRemaining: 0,
      signalBreakdown: signals,
      telemetry: {
        headPitch: this.lastVision.headPitch,
        headYaw: this.lastVision.headYaw,
        gazeScore: this.lastVision.gazeScore,
        handActivity: this.lastVision.handActivity,
        bodyPostureStable: this.lastVision.bodyPostureStable,
        keyboardActive: this.lastActivity.keyboardActive,
        mouseActive: this.lastActivity.mouseActive,
        idleSeconds: this.lastActivity.idleSeconds,
        studyMedium: this.settings.studyMedium,
        lightingLevel: this.lastVision.lightingLevel,
        faceCount: this.lastVision.faceCount
      },
      recentTransitions: this.transitionLogs.slice(-10)
    };
  }

  updateVision(data: VisionData): void {
    this.lastVision = data;
    this.evaluate();
  }

  updateActivity(data: ActivityData): void {
    this.lastActivity = data;
    this.evaluate();
  }

  subscribe(callback: FocusEngineCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getState(): FocusState {
    return this.currentState;
  }

  setState(newState: FocusState, customReason?: string): void {
    if (this.currentState !== newState) {
      this.recordTransition(this.currentState, newState, this.smoothedScore, customReason || 'Manual state change');
    }
    this.currentState = newState;
    if (newState === 'BREAK' || newState === 'IDLE' || newState === 'COMPLETED' || newState === 'UNVERIFIED') {
      this.distractionStartTime = null;
      this.awayStartTime = null;
      this.returnFocusStartTime = null;
    }
    this.evaluate();
  }

  private recordTransition(oldState: FocusState, newState: FocusState, score: number, reason: string): void {
    const log: StateTransitionLog = {
      id: 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      oldState,
      newState,
      focusScore: score,
      reason
    };
    this.transitionLogs.push(log);
    if (this.transitionLogs.length > 100) {
      this.transitionLogs.shift();
    }
  }

  /**
   * Multi-Signal Soft Evidence Fusion Model:
   * Replaces hard rules with continuous weighted evidence.
   * Head-down and gaze-away are WEAK signals (0 to -3 at most in screen mode; 0 in paper/mixed).
   */
  private calculateScore(): {
    totalScore: number;
    signals: FocusEngineOutput['signalBreakdown'];
    reason?: string;
    explanation: string;
  } {
    const v = this.lastVision;
    const a = this.lastActivity;
    const w = this.settings;
    const medium = w.studyMedium || 'Screen Study';
    const profile = calibrationEngine.getProfile();

    let reason: string | undefined;
    let explanation: string = 'Active study concentration detected.';

    // Base score starts at neutral baseline
    let score = 50;

    // 1. Face Presence Signal (+25 to +30)
    let faceScore = 0;
    if (v.facePresent) {
      faceScore = 100;
      score += 25;
    } else {
      faceScore = 0;
      score -= 40;
      if (v.lightingLevel === 'dark') {
        reason = 'Camera confidence reduced due to low visibility / dark lighting';
        explanation = 'Camera visibility low. Operating in smart study tolerance mode.';
      } else {
        reason = 'No person detected at the workstation';
        explanation = 'Workstation empty. Waiting for return to study desk.';
      }
    }

    // 2. Stable Seated Posture Signal (+15)
    let postureScore = 70;
    if (v.bodyPostureStable) {
      postureScore = 100;
      score += 15;
    } else {
      postureScore = 50;
      score += 5; // gentle, don't heavily penalize stretching or fidgeting
    }

    // 3. Desk & Hand / Writing Motion Signal (+15 to +20)
    let deskScore = 50;
    if (v.handActivity || (v.deskActivityScore && v.deskActivityScore > 0.2)) {
      deskScore = 95;
      score += 20;
      if (medium === 'Paper / PYQ Study' || medium === 'Mixed Study') {
        explanation = 'Notebook-oriented posture detected with continued desk presence.';
      }
    } else if (medium === 'Paper / PYQ Study') {
      // Quiet thinking pause during math / PYQ
      deskScore = 80;
      score += 12;
      explanation = 'Quiet calculation or contemplation period at study desk.';
    }

    // 4. Computer Activity (Supporting soft signal: +5 to +10, never required)
    let activityScore = 70;
    if (a.keyboardActive || a.mouseActive) {
      activityScore = 100;
      score += 10;
    } else {
      activityScore = 75;
      // ZERO PENALTY for no keyboard/mouse in paper or mixed mode
      if (medium === 'Screen Study' && a.idleSeconds > 300) {
        score -= 5;
      }
    }

    // 5. Active Application Context (Supporting soft signal: -15 to +10)
    let appContextScore = 85;
    if (w.enableWindowContext) {
      const isDistracting = w.distractingApps.some(app =>
        a.activeApp.toLowerCase().includes(app.toLowerCase())
      );
      const isStudy = w.studyApps.some(app =>
        a.activeApp.toLowerCase().includes(app.toLowerCase())
      );

      if (isDistracting) {
        appContextScore = 15;
        score -= 45;
        if (a.keyboardActive || a.mouseActive) {
          score -= 10; // Active gaming/social typing does not count as study productivity
        }
        reason = `Distraction application in foreground (${a.activeApp})`;
        explanation = `Study focus reduced: Active app is ${a.activeApp}.`;
      } else if (isStudy) {
        appContextScore = 100;
        score += 10;
      }
    }

    // 6. Head Pose & Desk Angle (Soft signal: 0 to -3 weak penalty)
    let headPoseScore = 90;
    const yawTolerance = profile.isCalibrated ? profile.tolerances.yawTolerance : 30;
    const absYaw = Math.abs(v.headYaw);

    if (absYaw > yawTolerance + 15) {
      headPoseScore = 55;
      score -= 8;
      if (!reason) reason = 'Head turned significantly away from workstation';
    } else if (absYaw > yawTolerance) {
      headPoseScore = 75;
      score -= 3; // very weak
    } else {
      headPoseScore = 95;
      score += 5;
    }

    // Downward pitch handling:
    // In Paper Study or Mixed Study: downward pitch is positive study evidence!
    if (v.isLookingDown || v.headPitch < -8) {
      if (medium === 'Paper / PYQ Study' || medium === 'Mixed Study') {
        headPoseScore = 98;
        score += 10;
        explanation = 'Notebook-oriented posture detected with continued desk presence.';
      } else {
        // In Screen Study: soft glance down at keyboard or notes (weak signal -2)
        headPoseScore = 88;
        score -= 2;
      }
    }

    // 7. Gaze State (Weak signal: 0 to -3)
    let eyeGazeScore = Math.round(v.gazeScore * 100);
    if (v.isLookingDown && (medium === 'Paper / PYQ Study' || medium === 'Mixed Study')) {
      eyeGazeScore = 95;
      score += 5;
    } else if (v.gazeScore < 0.6) {
      score -= 3; // weak
    }

    // 8. Multi-face handling
    if (v.faceCount && v.faceCount > 1) {
      score -= 5; // slight ambiguity, but never pauses
    }

    // Clamp total score
    const finalScore = Math.min(100, Math.max(0, score));

    return {
      totalScore: finalScore,
      signals: {
        faceScore,
        headPoseScore,
        eyeGazeScore,
        activityScore,
        appContextScore,
        deskActivityScore: Math.round((v.deskActivityScore || 0) * 100),
        postureStableScore: postureScore,
        lightingScore: Math.round((v.lightingScore || 0.5) * 100)
      },
      reason,
      explanation
    };
  }

  private evaluate(): void {
    if (
      this.currentState === 'IDLE' ||
      this.currentState === 'BREAK' ||
      this.currentState === 'COMPLETED' ||
      this.currentState === 'UNVERIFIED'
    ) {
      return;
    }

    const now = this.lastVision.timestamp || Date.now();
    const { totalScore, signals, reason, explanation } = this.calculateScore();

    // Append to rolling 10-second temporal window
    this.rollingObservations.push({
      timestamp: now,
      focusScore: totalScore,
      facePresent: this.lastVision.facePresent,
      headYaw: this.lastVision.headYaw,
      headPitch: this.lastVision.headPitch,
      gazeScore: this.lastVision.gazeScore,
      handActivity: this.lastVision.handActivity,
      bodyPostureStable: this.lastVision.bodyPostureStable,
      keyboardActive: this.lastActivity.keyboardActive,
      mouseActive: this.lastActivity.mouseActive,
      idleSeconds: this.lastActivity.idleSeconds,
      activeApp: this.lastActivity.activeApp
    });

    // Keep last 10 seconds of observations (assuming ~10 FPS -> max 100 samples)
    this.rollingObservations = this.rollingObservations.filter(o => now - o.timestamp <= 10000);

    // Weighted temporal smoothing: recent samples weighted heavier
    if (this.rollingObservations.length > 0) {
      let weightedSum = 0;
      let totalWeights = 0;
      const count = this.rollingObservations.length;

      this.rollingObservations.forEach((obs, idx) => {
        // Linearly increasing weight: older samples weight 1, latest sample weight ~2.5
        const weight = 1.0 + (idx / count) * 1.5;
        weightedSum += obs.focusScore * weight;
        totalWeights += weight;
      });

      this.smoothedScore = Math.round(weightedSum / totalWeights);
    } else {
      this.smoothedScore = totalScore;
    }

    const isFacePresent = this.lastVision.facePresent;
    const {
      focusThreshold,
      warningThreshold,
      distractionGraceSeconds,
      returnConfirmationSeconds,
      awayThresholdSeconds,
      studyMedium
    } = this.settings;

    let nextState = this.currentState;
    let isGraceActive = false;
    let graceSecondsRemaining = 0;
    let returnSecondsRemaining = 0;
    let transitionReason = reason || 'Continuous score evaluation';

    // 1. Check AWAY condition: confirmed face absence
    if (!isFacePresent) {
      if (this.awayStartTime === null) {
        this.awayStartTime = now;
      }
      const awayDuration = (now - this.awayStartTime) / 1000;
      if (awayDuration >= awayThresholdSeconds) {
        nextState = 'AWAY';
        transitionReason = `Absence confirmed: No subject detected for ${awayThresholdSeconds}s`;
      } else {
        // Enter UNCERTAIN / WARNING during absence grace period (never instant pause!)
        nextState = 'UNCERTAIN';
        isGraceActive = true;
        graceSecondsRemaining = Math.max(0, Math.ceil(awayThresholdSeconds - awayDuration));
        transitionReason = `Subject absent from view (${graceSecondsRemaining}s grace)`;
      }
    } else {
      // Face is present
      this.awayStartTime = null;

      // Determine appropriate target focused state
      let targetFocusedState: FocusState = 'FOCUSED_SCREEN';
      const isLookingDownPaper = this.lastVision.isLookingDown || this.lastVision.headPitch < -8 || this.lastVision.handActivity;

      if (studyMedium === 'Paper / PYQ Study') {
        targetFocusedState = 'FOCUSED_PAPER';
      } else if (studyMedium === 'Mixed Study') {
        targetFocusedState = isLookingDownPaper ? 'FOCUSED_PAPER' : 'FOCUSED_SCREEN';
      } else {
        targetFocusedState = 'FOCUSED_SCREEN';
      }

      if (this.smoothedScore >= focusThreshold) {
        this.distractionStartTime = null;

        // If resuming from PAUSED or AWAY or DISTRACTED, require return confirmation
        if (this.currentState === 'PAUSED' || this.currentState === 'AWAY' || this.currentState === 'DISTRACTED') {
          if (this.returnFocusStartTime === null) {
            this.returnFocusStartTime = now;
          }
          const focusDuration = (now - this.returnFocusStartTime) / 1000;
          if (focusDuration >= returnConfirmationSeconds) {
            nextState = targetFocusedState;
            transitionReason = 'Focus confirmed after return stability check';
            this.returnFocusStartTime = null;
          } else {
            returnSecondsRemaining = Math.max(0, Math.ceil(returnConfirmationSeconds - focusDuration));
          }
        } else {
          // Already focused or in uncertain state -> smoothly enter verified target state
          nextState = targetFocusedState;
          this.returnFocusStartTime = null;
        }
      } else if (this.smoothedScore >= warningThreshold) {
        // Mild uncertainty (e.g. temporary glance, stretching, lighting fluctuation)
        this.returnFocusStartTime = null;
        nextState = 'UNCERTAIN';
        transitionReason = reason || 'Evidence temporarily ambiguous';
      } else {
        // Low confidence (< warningThreshold) -> persistent distraction evidence required
        this.returnFocusStartTime = null;
        if (this.distractionStartTime === null) {
          this.distractionStartTime = now;
        }
        const distractionDuration = (now - this.distractionStartTime) / 1000;
        if (distractionDuration >= distractionGraceSeconds) {
          nextState = 'PAUSED';
          transitionReason = reason || `Persistent distraction detected for ${distractionGraceSeconds}s`;
        } else {
          nextState = 'DISTRACTED';
          isGraceActive = true;
          graceSecondsRemaining = Math.max(0, Math.ceil(distractionGraceSeconds - distractionDuration));
          transitionReason = reason || `Distraction grace active (${graceSecondsRemaining}s)`;
        }
      }
    }

    if (this.currentState !== nextState) {
      this.recordTransition(this.currentState, nextState, this.smoothedScore, transitionReason);
    }
    this.currentState = nextState;

    const output: FocusEngineOutput = {
      state: this.currentState,
      score: this.smoothedScore,
      rawScore: totalScore,
      facePresent: isFacePresent,
      distractionReason: reason,
      stateExplanation: explanation,
      isGracePeriodActive: isGraceActive,
      graceSecondsRemaining,
      returnConfirmationRemaining: returnSecondsRemaining,
      signalBreakdown: signals,
      telemetry: {
        headPitch: this.lastVision.headPitch,
        headYaw: this.lastVision.headYaw,
        gazeScore: this.lastVision.gazeScore,
        handActivity: this.lastVision.handActivity,
        bodyPostureStable: this.lastVision.bodyPostureStable,
        keyboardActive: this.lastActivity.keyboardActive,
        mouseActive: this.lastActivity.mouseActive,
        idleSeconds: this.lastActivity.idleSeconds,
        studyMedium: this.settings.studyMedium,
        lightingLevel: this.lastVision.lightingLevel,
        faceCount: this.lastVision.faceCount
      },
      recentTransitions: this.transitionLogs.slice(-10)
    };

    this.callbacks.forEach(cb => cb(output));
  }
}

export const focusEngine = new FocusEngine();
