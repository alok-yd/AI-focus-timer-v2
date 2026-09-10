import { FocusEngineSettings, SensitivityPreset, SubjectItem, UserSettings } from '../types';

export const SENSITIVITY_PRESETS: Record<SensitivityPreset, Partial<FocusEngineSettings>> = {
  relaxed: {
    focusThreshold: 65,
    warningThreshold: 45,
    distractionGraceSeconds: 8,
    returnConfirmationSeconds: 2,
    awayThresholdSeconds: 12,
  },
  balanced: {
    focusThreshold: 75,
    warningThreshold: 50,
    distractionGraceSeconds: 5,
    returnConfirmationSeconds: 3,
    awayThresholdSeconds: 8,
  },
  strict: {
    focusThreshold: 85,
    warningThreshold: 60,
    distractionGraceSeconds: 3,
    returnConfirmationSeconds: 4,
    awayThresholdSeconds: 5,
  },
};

export const DEFAULT_STUDY_APPS = [
  'Visual Studio Code',
  'Chrome (Educational)',
  'Microsoft Edge',
  'PDF Reader / Adobe Acrobat',
  'Notion',
  'Obsidian',
  'Google Docs',
  'gateoverflow.in',
  'Coursera / NPTEL',
  'Terminal / Bash'
];

export const DEFAULT_DISTRACTING_APPS = [
  'Instagram',
  'Twitter / X',
  'Discord (Social)',
  'Steam / Games',
  'Netflix / Prime Video',
  'TikTok / Shorts',
  'Reddit (Casual)'
];

export const GATE_SUBJECTS: SubjectItem[] = [
  { id: 'algo', name: 'Algorithms', category: 'Core CS', isGateSubject: true },
  { id: 'ds', name: 'Data Structures', category: 'Core CS', isGateSubject: true },
  { id: 'dbms', name: 'Database Management Systems (DBMS)', category: 'Systems', isGateSubject: true },
  { id: 'os', name: 'Operating Systems', category: 'Systems', isGateSubject: true },
  { id: 'cn', name: 'Computer Networks', category: 'Systems', isGateSubject: true },
  { id: 'coa', name: 'Computer Organization & Architecture (COA)', category: 'Hardware', isGateSubject: true },
  { id: 'toc', name: 'Theory of Computation (TOC)', category: 'Theory', isGateSubject: true },
  { id: 'cd', name: 'Compiler Design', category: 'Theory', isGateSubject: true },
  { id: 'dl', name: 'Digital Logic', category: 'Hardware', isGateSubject: true },
  { id: 'dm', name: 'Discrete Mathematics', category: 'Mathematics', isGateSubject: true },
  { id: 'em', name: 'Engineering Mathematics', category: 'Mathematics', isGateSubject: true },
  { id: 'ga', name: 'General Aptitude', category: 'Aptitude', isGateSubject: true }
];

export const DEFAULT_FOCUS_SETTINGS: FocusEngineSettings = {
  preset: 'balanced',
  studyMedium: 'Screen Study',
  focusThreshold: 75,
  warningThreshold: 50,
  distractionGraceSeconds: 5,
  returnConfirmationSeconds: 3,
  awayThresholdSeconds: 8,
  paperHeadDownToleranceSeconds: 300,
  analysisFps: 10,
  
  weightFacePresence: 30,
  weightHeadPose: 25,
  weightEyeGaze: 25,
  weightActivity: 10,
  weightAppContext: 10,

  enableKeyboardDetection: true,
  enableMouseDetection: true,
  enableWindowContext: true,

  studyApps: DEFAULT_STUDY_APPS,
  distractingApps: DEFAULT_DISTRACTING_APPS
};

export const DEFAULT_SETTINGS: UserSettings = {
  dailyTargetHours: 12,
  selectedCameraId: '',
  frameRateFps: 10,
  autoStartCameraOnSession: true,

  studyMedium: 'Screen Study',
  focusSensitivityPreset: 'Balanced',
  focusThreshold: 70,
  warningThreshold: 50,
  distractionGracePeriodSeconds: 4,
  returnConfirmationSeconds: 3,
  awayThresholdSeconds: 10,
  paperHeadDownToleranceSeconds: 300,

  enableKeyboardTracking: true,
  enableMouseTracking: true,
  enableWindowContext: true,
  activityIdleTimeoutSeconds: 45,

  studyApplications: DEFAULT_STUDY_APPS,
  distractingApplications: DEFAULT_DISTRACTING_APPS,

  focusSettings: DEFAULT_FOCUS_SETTINGS,
  soundNotifications: true,
  desktopNotifications: true,
  minimizeToTrayOnClose: true,
  startWithWindows: false,
  examName: 'GATE 2027 CSE',
  examDate: '2027-02-06',
  hasCompletedOnboarding: false,
  autoSyncGoogleCalendar: false
};

export const DEFAULT_USER_SETTINGS: UserSettings = DEFAULT_SETTINGS;
