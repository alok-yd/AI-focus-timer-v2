export type FocusState = 
  | 'IDLE' 
  | 'FOCUSED' 
  | 'FOCUSED_SCREEN' 
  | 'FOCUSED_PAPER' 
  | 'FOCUSED_MIXED' 
  | 'THINKING'
  | 'UNCERTAIN' 
  | 'WARNING' 
  | 'PHONE_USE'
  | 'CONVERSATION'
  | 'POSSIBLE_SLEEP'
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
  state === 'FOCUSED_MIXED' ||
  state === 'THINKING';

export type ActivityType =
  | 'SCREEN_READING'
  | 'SCREEN_TYPING'
  | 'PAPER_READING'
  | 'PAPER_WRITING'
  | 'PYQ_SOLVING'
  | 'CALCULATING'
  | 'THINKING'
  | 'NOTE_TAKING'
  | 'NORMAL_MOVEMENT'
  | 'DRINKING'
  | 'PHONE_USE'
  | 'CONVERSATION'
  | 'AWAY'
  | 'POSSIBLE_SLEEP'
  | 'BREAK'
  | 'UNKNOWN';

export type FaceVisibilityCategory = 'HIGH_VISIBILITY' | 'MEDIUM_VISIBILITY' | 'LOW_VISIBILITY';

export interface FocusConfidenceVector {
  screenStudyConfidence: number; // 0 to 1
  paperStudyConfidence: number; // 0 to 1
  thinkingConfidence: number; // 0 to 1
  phoneConfidence: number; // 0 to 1
  conversationConfidence: number; // 0 to 1
  sleepConfidence: number; // 0 to 1
  awayConfidence: number; // 0 to 1
  overallFocusConfidence: number; // 0 to 1
}

export interface StudyZoneBounds {
  minX: number; // 0 to 100%
  maxX: number; // 0 to 100%
  minY: number; // 0 to 100%
  maxY: number; // 0 to 100%
  baselineCentroid: { x: number; y: number };
}

export type FocusMode = 'Deep Focus' | 'Normal Study' | 'Revision' | 'PYQ Practice' | 'Mock Test' | 'Custom';

export type StudyMedium = 'Screen Study' | 'Paper / PYQ Study' | 'Mixed Study';

export type SensitivityPreset = 'relaxed' | 'balanced' | 'strict';

export interface VisionData {
  facePresent: boolean;
  confidence: number;
  faceVisibilityCategory?: FaceVisibilityCategory;
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
  inStudyZone?: boolean;
  mouthMovementScore?: number; // 0 to 1
  phoneDetectedScore?: number; // 0 to 1
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
  phoneBaselineScore?: number;
  studyZone?: StudyZoneBounds;
  tolerances: {
    yawTolerance: number;
    pitchTolerance: number;
    awayToleranceSeconds: number;
    phoneGraceSeconds?: number;
    conversationGraceSeconds?: number;
    sleepGraceSeconds?: number;
  };
}

export interface ActivityEventLog {
  id: string;
  timestamp: number;
  activity: ActivityType;
  durationSeconds: number;
  details?: string;
}

export interface TemporalObservation {
  timestamp: number;
  focusScore: number;
  activity?: ActivityType;
  confidenceVector?: FocusConfidenceVector;
  facePresent: boolean;
  faceVisibility?: FaceVisibilityCategory;
  headYaw: number;
  headPitch: number;
  gazeScore: number;
  handActivity: boolean;
  bodyPostureStable: boolean;
  phoneScore?: number;
  conversationScore?: number;
  sleepScore?: number;
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
  activity?: ActivityType;
  focusScore: number;
  confidenceVector?: FocusConfidenceVector;
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
  thinkingSeconds?: number;
  warningSeconds: number;
  uncertainSeconds?: number;
  distractedSeconds: number;
  phoneDistractedSeconds?: number;
  conversationSeconds?: number;
  possibleSleepSeconds?: number;
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
  activityEvents?: ActivityEventLog[];
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
  activity?: ActivityType;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  targetSeconds: number;
  focusedSeconds: number;
  screenFocusedSeconds: number;
  paperFocusedSeconds: number;
  mixedFocusedSeconds?: number;
  thinkingSeconds?: number;
  uncertainSeconds?: number;
  distractedSeconds: number;
  phoneDistractedSeconds?: number;
  conversationSeconds?: number;
  possibleSleepSeconds?: number;
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
