export type FocusState = 
  | 'IDLE' 
  | 'FOCUSED' 
  | 'FOCUSED_SCREEN' 
  | 'FOCUSED_PAPER' 
  | 'FOCUSED_MIXED' 
  | 'UNCERTAIN' 
  | 'WARNING' 
  | 'DISTRACTED' 
  | 'AWAY' 
  | 'BREAK' 
  | 'PAUSED' 
  | 'COMPLETED'
  | 'UNVERIFIED';

export const isFocusedState = (state: FocusState): boolean =>
  state === 'FOCUSED' ||
  state === 'FOCUSED_SCREEN' ||
  state === 'FOCUSED_PAPER' ||
  state === 'FOCUSED_MIXED';

export type FocusMode = 'Deep Focus' | 'Normal Study' | 'Revision' | 'PYQ Practice' | 'Mock Test' | 'Custom';

export type StudyMedium = 'Screen Study' | 'Paper / PYQ Study' | 'Mixed Study';

export type SensitivityPreset = 'relaxed' | 'balanced' | 'strict';

export interface VisionData {
  facePresent: boolean;
  confidence: number;
  headYaw: number; // degrees: negative = left, positive = right
  headPitch: number; // degrees: negative = down, positive = up
  headRoll: number;
  eyeOpen: boolean;
  gazeScore: number; // 0 to 1
  faceBox?: { x: number; y: number; width: number; height: number };
  handActivity: boolean; // Estimated writing / hand interaction in desk area
  bodyPostureStable: boolean; // Seated stably in front of desk
  deskActivityScore: number; // 0 to 1
  isLookingDown: boolean; // Natural desk / notebook focus angle
  lightingLevel?: 'dark' | 'low' | 'normal' | 'bright';
  lightingScore?: number; // 0 to 1
  faceCount?: number;
  cameraHealthy?: boolean;
  timestamp: number;
}

export interface ActivityData {
  keyboardActive: boolean;
  mouseActive: boolean;
  idleSeconds: number;
  activeApp: string;
  isWindowFocused: boolean;
  lastActivityTimestamp: number;
}

export interface CalibrationProfile {
  isCalibrated: boolean;
  calibratedAt: number;
  baselineScreenYaw: number;
  baselineScreenPitch: number;
  baselinePaperYaw: number;
  baselinePaperPitch: number;
  deskYRatio: number; // e.g. 0.55
  lightingBaseline: number; // 0-255
  faceBoundingBoxRatio: number; // relative size of user face
  torsoCentroid: { x: number; y: number };
  tolerances: {
    yawTolerance: number;
    pitchTolerance: number;
    awayToleranceSeconds: number;
  };
}

export interface TemporalObservation {
  timestamp: number;
  focusScore: number;
  facePresent: boolean;
  headYaw: number;
  headPitch: number;
  gazeScore: number;
  handActivity: boolean;
  bodyPostureStable: boolean;
  keyboardActive: boolean;
  mouseActive: boolean;
  idleSeconds: number;
  activeApp: string;
}

export interface StateTransitionLog {
  id: string;
  timestamp: number;
  oldState: FocusState;
  newState: FocusState;
  focusScore: number;
  reason: string;
}

export interface EvaluationConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  falsePauseRate: number;
  confusionMatrix: EvaluationConfusionMatrix;
  totalScenarios: number;
  passedScenarios: number;
  timestamp: number;
  scenarioResults: Array<{
    name: string;
    category: string;
    expectedState: string;
    actualState: string;
    passed: boolean;
    details: string;
  }>;
}

export interface FocusEngineSettings {
  preset: SensitivityPreset;
  studyMedium: StudyMedium;
  focusThreshold: number; // default 75
  warningThreshold: number; // default 50
  distractionGraceSeconds: number; // default 5s
  returnConfirmationSeconds: number; // default 3s
  awayThresholdSeconds: number; // default 8s
  paperHeadDownToleranceSeconds: number; // default 300 (5 mins)
  analysisFps: number; // default 10
  
  // Weights (sum = 100)
  weightFacePresence: number; // 30
  weightHeadPose: number; // 25
  weightEyeGaze: number; // 25
  weightActivity: number; // 10
  weightAppContext: number; // 10

  // Activity toggles
  enableKeyboardDetection: boolean;
  enableMouseDetection: boolean;
  enableWindowContext: boolean;
  
  // App lists
  studyApps: string[];
  distractingApps: string[];
}

export interface UserSettings {
  dailyTargetHours: number; // default 8 or 12
  selectedCameraId: string;
  frameRateFps: number;
  autoStartCameraOnSession: boolean;

  studyMedium: StudyMedium;
  focusSensitivityPreset: 'Relaxed' | 'Balanced' | 'Strict' | 'Custom';
  focusThreshold: number;
  warningThreshold: number;
  distractionGracePeriodSeconds: number;
  returnConfirmationSeconds: number;
  awayThresholdSeconds: number;
  paperHeadDownToleranceSeconds: number;

  enableKeyboardTracking: boolean;
  enableMouseTracking: boolean;
  enableWindowContext: boolean;
  activityIdleTimeoutSeconds: number;

  studyApplications: string[];
  distractingApplications: string[];

  focusSettings: FocusEngineSettings;
  calibrationProfile?: CalibrationProfile;
  soundNotifications: boolean;
  desktopNotifications: boolean;
  minimizeToTrayOnClose: boolean;
  startWithWindows: boolean;
  examName: string; // e.g. "GATE 2027"
  examDate: string; // ISO date
  hasCompletedOnboarding: boolean;
  autoSyncGoogleCalendar: boolean;
}

export interface FocusSession {
  id: string;
  subject: string;
  topic: string;
  goal: string;
  mode: FocusMode;
  studyMedium?: StudyMedium;
  startTime: number;
  endTime: number;
  targetSeconds: number;
  focusedSeconds: number;
  screenFocusedSeconds: number;
  paperFocusedSeconds: number;
  mixedFocusedSeconds?: number;
  warningSeconds: number;
  uncertainSeconds?: number;
  distractedSeconds: number;
  awaySeconds: number;
  breakSeconds: number;
  unverifiedSeconds?: number;
  elapsedSeconds: number;
  averageFocusScore: number;
  peakFocusScore: number;
  distractionCount: number;
  status: 'COMPLETED' | 'STOPPED' | 'CANCELLED';
  syncedToCalendar?: boolean;
  calendarEventId?: string;
  notes?: string;
  transitionLogs?: StateTransitionLog[];
}

export interface FocusTimelineEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  state: FocusState;
  focusScore: number;
  facePresent: boolean;
  headYaw: number;
  headPitch: number;
  eyeOpen: boolean;
  activeApp: string;
  handActivity?: boolean;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  targetSeconds: number;
  focusedSeconds: number;
  screenFocusedSeconds: number;
  paperFocusedSeconds: number;
  mixedFocusedSeconds?: number;
  uncertainSeconds?: number;
  distractedSeconds: number;
  awaySeconds: number;
  breakSeconds: number;
  unverifiedSeconds?: number;
  sessionCount: number;
  longestSessionSeconds: number;
  averageSessionSeconds: number;
  efficiency: number; // 0-100%
  productivityScore: number; // 0-100%
}

export interface SubjectItem {
  id: string;
  name: string;
  category?: string;
  isGateSubject?: boolean;
}

export interface AICoachAnalysis {
  summary: string;
  strengths: string[];
  distractionTriggers: string[];
  bestTimeBlock: string;
  immediateAction: string;
  tomorrowRecommendation: string;
  burnoutWarning: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}
