import { DEFAULT_FOCUS_SETTINGS } from '../constants';
import {
  ActivityData,
  ActivityEventLog,
  ActivityType,
  FaceVisibilityCategory,
  FocusConfidenceVector,
  FocusEngineSettings,
  FocusState,
  StateTransitionLog,
  StudyMedium,
  UserSettings,
  VisionData
} from '../types';
import { calibrationEngine } from './calibrationEngine';
import { FaceAnalyzer } from './focus/analyzers/FaceAnalyzer';
import { PoseAnalyzer } from './focus/analyzers/PoseAnalyzer';
import { HandAnalyzer } from './focus/analyzers/HandAnalyzer';
import { PhoneAnalyzer } from './focus/analyzers/PhoneAnalyzer';
import { ConversationAnalyzer } from './focus/analyzers/ConversationAnalyzer';
import { SleepAnalyzer } from './focus/analyzers/SleepAnalyzer';
import { ComputerActivityAnalyzer } from './focus/analyzers/ComputerActivityAnalyzer';
import { ActivityRecognizer, ActivityRecognitionResult } from './focus/ActivityRecognizer';
import { EvidenceFusionEngine, EvidenceFusionResult } from './focus/EvidenceFusionEngine';
import { ContextMemory } from './focus/ContextMemory';
import { TemporalEngine } from './focus/TemporalEngine';
import { FocusStateMachine } from './focus/FocusStateMachine';

export interface FocusEngineOutput {
  state: FocusState;
  score: number;
  rawScore: number;
  facePresent: boolean;
  activity?: ActivityType;
  confidenceVector?: FocusConfidenceVector;
  faceVisibility?: FaceVisibilityCategory;
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
    headRoll?: number;
    gazeScore: number;
    handActivity: boolean;
    bodyPostureStable: boolean;
    keyboardActive: boolean;
    mouseActive: boolean;
    idleSeconds: number;
    studyMedium: StudyMedium;
    lightingLevel?: string;
    faceCount?: number;
    primaryActivity?: ActivityType;
    phoneConfidence?: number;
    sleepConfidence?: number;
    conversationConfidence?: number;
    inStudyZone?: boolean;
  };
  recentTransitions?: StateTransitionLog[];
  activityEvents?: ActivityEventLog[];
}

export type FocusEngineCallback = (output: FocusEngineOutput) => void;

export class FocusEngine {
  private settings: FocusEngineSettings;
  private currentState: FocusState = 'IDLE';

  // Modular Component Pipeline
  private faceAnalyzer = new FaceAnalyzer();
  private poseAnalyzer = new PoseAnalyzer();
  private handAnalyzer = new HandAnalyzer();
  private phoneAnalyzer = new PhoneAnalyzer();
  private conversationAnalyzer = new ConversationAnalyzer();
  private sleepAnalyzer = new SleepAnalyzer();
  private computerActivityAnalyzer = new ComputerActivityAnalyzer();
  private activityRecognizer = new ActivityRecognizer();
  private evidenceFusionEngine = new EvidenceFusionEngine();
  private contextMemory = new ContextMemory();
  private temporalEngine = new TemporalEngine();
  private focusStateMachine = new FocusStateMachine();

  // Cached last evaluation output
  private lastEvaluationOutput: FocusEngineOutput | null = null;

  // Last known raw sensory inputs
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
    return this.contextMemory.getTransitionLogs();
  }

  getActivityEvents(): ActivityEventLog[] {
    return this.contextMemory.getActivityEvents();
  }

  getCurrentOutput(): FocusEngineOutput {
    if (this.lastEvaluationOutput) {
      return this.lastEvaluationOutput;
    }
    this.evaluate();
    return this.lastEvaluationOutput!;
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
    const now = this.lastVision.timestamp || Date.now();
    if (this.currentState !== newState) {
      this.contextMemory.recordTransition(
        this.currentState,
        newState,
        this.temporalEngine.getSmoothedScore(),
        customReason || 'Manual state change',
        undefined,
        undefined,
        now
      );
    }
    this.currentState = newState;
    this.contextMemory.recordState(newState, now);

    if (newState === 'BREAK' || newState === 'IDLE' || newState === 'COMPLETED' || newState === 'UNVERIFIED') {
      this.temporalEngine.resetAllTimers();
    }
    this.evaluate();
  }

  private evaluate(): void {
    const now = this.lastVision.timestamp || Date.now();
    const profile = calibrationEngine.getProfile();
    const medium = this.settings.studyMedium || 'Screen Study';

    // 1. Modular Analyzers Execution
    const face = this.faceAnalyzer.analyze(this.lastVision, profile);
    const pose = this.poseAnalyzer.analyze(this.lastVision, profile, face);
    const hand = this.handAnalyzer.analyze(this.lastVision, profile, pose);
    const phone = this.phoneAnalyzer.analyze(this.lastVision, profile, pose, hand, this.lastActivity);
    const conv = this.conversationAnalyzer.analyze(this.lastVision, profile, pose, face);
    const sleep = this.sleepAnalyzer.analyze(this.lastVision, profile, face, pose, hand, this.lastActivity);
    const comp = this.computerActivityAnalyzer.analyze(this.lastActivity, this.settings, medium);

    // 2. Activity Recognition Layer
    const recentActivity = this.contextMemory.getRecentActivity();
    const activity: ActivityRecognitionResult = this.activityRecognizer.recognize(
      face,
      pose,
      hand,
      phone,
      conv,
      sleep,
      comp,
      medium,
      recentActivity
    );
    this.contextMemory.recordActivity(activity.primaryActivity, now);

    // 3. Evidence Fusion & Focus Confidence Vector
    const evidence: EvidenceFusionResult = this.evidenceFusionEngine.fuse(
      face,
      pose,
      hand,
      phone,
      conv,
      sleep,
      comp,
      activity,
      this.settings,
      medium
    );

    // 4. Temporal Reasoning & Smoothing
    this.temporalEngine.recordObservation({
      timestamp: now,
      focusScore: evidence.totalFocusScore,
      activity: activity.primaryActivity,
      confidenceVector: evidence.confidenceVector,
      facePresent: face.facePresent,
      faceVisibility: face.visibilityCategory,
      headYaw: pose.headYaw,
      headPitch: pose.headPitch,
      gazeScore: face.gazeScore,
      handActivity: hand.handActivity,
      bodyPostureStable: pose.isSeatedPostureStable,
      phoneScore: phone.phoneConfidence,
      conversationScore: conv.conversationConfidence,
      sleepScore: sleep.sleepConfidence,
      keyboardActive: comp.keyboardActive,
      mouseActive: comp.mouseActive,
      idleSeconds: comp.idleSeconds,
      activeApp: comp.activeApp
    });

    const smoothedScore = this.temporalEngine.getSmoothedScore();

    // 5. Hierarchical Focus State Machine
    const smResult = this.focusStateMachine.evaluate(
      this.currentState,
      activity,
      evidence,
      face,
      pose,
      hand,
      phone,
      conv,
      sleep,
      comp,
      this.temporalEngine,
      this.contextMemory,
      this.settings,
      medium,
      now
    );

    if (smResult.hasStateChanged) {
      this.contextMemory.recordTransition(
        this.currentState,
        smResult.nextState,
        smoothedScore,
        smResult.distractionReason || smResult.stateExplanation,
        activity.primaryActivity,
        evidence.confidenceVector,
        now
      );
      this.currentState = smResult.nextState;
      this.contextMemory.recordState(this.currentState, now);
    }

    // 6. Build Output
    this.lastEvaluationOutput = {
      state: this.currentState,
      score: smoothedScore,
      rawScore: evidence.totalFocusScore,
      facePresent: face.facePresent,
      activity: activity.primaryActivity,
      confidenceVector: evidence.confidenceVector,
      faceVisibility: face.visibilityCategory,
      distractionReason: smResult.distractionReason,
      stateExplanation: smResult.stateExplanation,
      isGracePeriodActive: smResult.isGracePeriodActive,
      graceSecondsRemaining: smResult.graceSecondsRemaining,
      returnConfirmationRemaining: smResult.returnConfirmationRemaining,
      signalBreakdown: evidence.signalScores,
      telemetry: {
        headPitch: pose.headPitch,
        headYaw: pose.headYaw,
        headRoll: pose.headRoll,
        gazeScore: face.gazeScore,
        handActivity: hand.handActivity,
        bodyPostureStable: pose.isSeatedPostureStable,
        keyboardActive: comp.keyboardActive,
        mouseActive: comp.mouseActive,
        idleSeconds: comp.idleSeconds,
        studyMedium: medium,
        lightingLevel: face.lightingLevel,
        faceCount: face.faceCount,
        primaryActivity: activity.primaryActivity,
        phoneConfidence: phone.phoneConfidence,
        sleepConfidence: sleep.sleepConfidence,
        conversationConfidence: conv.conversationConfidence,
        inStudyZone: pose.inStudyZone
      },
      recentTransitions: this.contextMemory.getTransitionLogs().slice(-10),
      activityEvents: this.contextMemory.getActivityEvents().slice(-10)
    };

    // 7. Dispatch to listeners
    this.callbacks.forEach(cb => cb(this.lastEvaluationOutput!));
  }
}

export const focusEngine = new FocusEngine();

