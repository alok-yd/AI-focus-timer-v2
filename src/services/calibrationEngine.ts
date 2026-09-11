import { CalibrationProfile, VisionData } from '../types';
import { StorageService } from './storage';

export const DEFAULT_CALIBRATION_PROFILE: CalibrationProfile = {
  isCalibrated: false,
  calibratedAt: 0,
  baselineScreenYaw: 0,
  baselineScreenPitch: -4,
  baselinePaperYaw: 0,
  baselinePaperPitch: -18,
  deskYRatio: 0.55,
  lightingBaseline: 128,
  faceBoundingBoxRatio: 0.45,
  torsoCentroid: { x: 80, y: 70 },
  phoneBaselineScore: 0.15,
  studyZone: {
    minX: 10,
    maxX: 90,
    minY: 10,
    maxY: 90,
    baselineCentroid: { x: 50, y: 50 }
  },
  tolerances: {
    yawTolerance: 30,
    pitchTolerance: 22,
    awayToleranceSeconds: 10,
    phoneGraceSeconds: 10,
    conversationGraceSeconds: 12,
    sleepGraceSeconds: 35
  }
};

export interface CalibrationStepInfo {
  step: number;
  title: string;
  durationSeconds: number;
  instructions: string;
  expectedState: string;
}

export const CALIBRATION_STEPS: CalibrationStepInfo[] = [
  {
    step: 1,
    title: 'Normal Screen Study',
    durationSeconds: 30,
    instructions: 'Sit comfortably and look normally at your monitor as if studying a slide or coding.',
    expectedState: 'FOCUSED_SCREEN'
  },
  {
    step: 2,
    title: 'Screen Reading',
    durationSeconds: 30,
    instructions: 'Read study documentation or lecture text on your screen without touching mouse or keyboard.',
    expectedState: 'FOCUSED_SCREEN'
  },
  {
    step: 3,
    title: 'Paper Reading Posture',
    durationSeconds: 30,
    instructions: 'Look down naturally at your notebook or syllabus printout at your desk.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 4,
    title: 'Writing & PYQ Solving',
    durationSeconds: 60,
    instructions: 'Hold a pen and write equations, solve algorithms, or take notes in your notebook.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 5,
    title: 'Quiet Thinking Looking Down',
    durationSeconds: 30,
    instructions: 'Rest your hands still on the desk, looking down contemplating a difficult mathematical problem.',
    expectedState: 'THINKING'
  },
  {
    step: 6,
    title: 'Looking Sideways Briefly',
    durationSeconds: 15,
    instructions: 'Glance briefly to your left or right (e.g. at a physical textbook or calculator).',
    expectedState: 'UNCERTAIN'
  },
  {
    step: 7,
    title: 'Drink Water at Desk',
    durationSeconds: 15,
    instructions: 'Take a sip of water or adjust your glass at your desk.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 8,
    title: 'Posture Adjustment',
    durationSeconds: 15,
    instructions: 'Shift comfortably in your chair or stretch your back gently.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 9,
    title: 'Phone Interaction Baseline',
    durationSeconds: 20,
    instructions: 'Hold a smartphone in your hands as you naturally would, so the detector models phone posture.',
    expectedState: 'PHONE_USE'
  },
  {
    step: 10,
    title: 'Step Away from Workstation',
    durationSeconds: 15,
    instructions: 'Step out of camera view so the system calibrates your empty workstation state.',
    expectedState: 'AWAY'
  },
  {
    step: 11,
    title: 'Return to Study Desk',
    durationSeconds: 15,
    instructions: 'Sit back down at your desk and resume your study position.',
    expectedState: 'FOCUSED_SCREEN'
  }
];

export class CalibrationEngine {
  private profile: CalibrationProfile = DEFAULT_CALIBRATION_PROFILE;
  private currentStep: number = 0;
  private stepSamples: Map<number, VisionData[]> = new Map();

  constructor() {
    this.loadProfile();
  }

  loadProfile(): CalibrationProfile {
    const saved = StorageService.getCalibrationProfile();
    if (saved && saved.isCalibrated) {
      this.profile = saved;
    } else {
      this.profile = { ...DEFAULT_CALIBRATION_PROFILE };
    }
    return this.profile;
  }

  getProfile(): CalibrationProfile {
    return this.profile;
  }

  startCalibration(): void {
    this.currentStep = 1;
    this.stepSamples.clear();
  }

  setStep(stepNumber: number): void {
    this.currentStep = stepNumber;
    if (!this.stepSamples.has(stepNumber)) {
      this.stepSamples.set(stepNumber, []);
    }
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  feedSample(data: VisionData): void {
    if (this.currentStep < 1 || this.currentStep > 11) return;
    const samples = this.stepSamples.get(this.currentStep) || [];
    samples.push(data);
    this.stepSamples.set(this.currentStep, samples);
  }

  getStepSampleCount(step: number): number {
    return (this.stepSamples.get(step) || []).length;
  }

  /**
   * Quick auto-calibrate: generates a solid baseline from a collection of immediate samples.
   */
  autoCalibrateFromSample(sample: VisionData): CalibrationProfile {
    const baselineYaw = sample.headYaw || 0;
    const baselinePitch = sample.headPitch || -4;
    const paperPitch = baselinePitch - 14;

    const newProfile: CalibrationProfile = {
      isCalibrated: true,
      calibratedAt: Date.now(),
      baselineScreenYaw: baselineYaw,
      baselineScreenPitch: baselinePitch,
      baselinePaperYaw: baselineYaw,
      baselinePaperPitch: paperPitch,
      deskYRatio: 0.55,
      lightingBaseline: sample.lightingScore ? Math.round(sample.lightingScore * 255) : 128,
      faceBoundingBoxRatio: sample.faceBox ? sample.faceBox.width / 100 : 0.45,
      torsoCentroid: { x: sample.faceBox ? sample.faceBox.x + sample.faceBox.width / 2 : 50, y: 50 },
      phoneBaselineScore: 0.15,
      studyZone: {
        minX: 10,
        maxX: 90,
        minY: 10,
        maxY: 90,
        baselineCentroid: { x: 50, y: 50 }
      },
      tolerances: {
        yawTolerance: 30,
        pitchTolerance: 22,
        awayToleranceSeconds: 10,
        phoneGraceSeconds: 10,
        conversationGraceSeconds: 12,
        sleepGraceSeconds: 35
      }
    };

    this.saveProfile(newProfile);
    return newProfile;
  }

  /**
   * Finalize all 11 steps and calculate optimized, robust personal profile
   */
  finalizeCalibration(): CalibrationProfile {
    // Step 1 & 2: Screen postures
    const step1 = this.stepSamples.get(1) || [];
    const step2 = this.stepSamples.get(2) || [];
    const screenSamples = [...step1, ...step2];
    const screenYaws = screenSamples.map(s => s.headYaw);
    const screenPitches = screenSamples.map(s => s.headPitch);
    const baselineScreenYaw = screenYaws.length > 0 ? Math.round(screenYaws.reduce((a, b) => a + b, 0) / screenYaws.length) : 0;
    const baselineScreenPitch = screenPitches.length > 0 ? Math.round(screenPitches.reduce((a, b) => a + b, 0) / screenPitches.length) : -4;

    // Step 3 & 4: Paper reading & writing postures
    const step3 = this.stepSamples.get(3) || [];
    const step4 = this.stepSamples.get(4) || [];
    const paperSamples = [...step3, ...step4];
    const paperPitches = paperSamples.map(s => s.headPitch);
    const baselinePaperPitch = paperPitches.length > 0 ? Math.round(paperPitches.reduce((a, b) => a + b, 0) / paperPitches.length) : -18;
    const paperYaws = paperSamples.map(s => s.headYaw);
    const baselinePaperYaw = paperYaws.length > 0 ? Math.round(paperYaws.reduce((a, b) => a + b, 0) / paperYaws.length) : 0;

    // Step 6: Sideways glance tolerance
    const step6 = this.stepSamples.get(6) || [];
    const sidewaysYaws = step6.map(s => Math.abs(s.headYaw));
    const maxSidewaysYaw = sidewaysYaws.length > 0 ? Math.max(...sidewaysYaws) : 32;
    const yawTolerance = Math.min(45, Math.max(25, maxSidewaysYaw + 5));

    // Step 9: Phone baseline
    const step9 = this.stepSamples.get(9) || [];
    const phoneScores = step9.map(s => s.phoneDetectedScore ?? 0.7);
    const phoneBaselineScore = phoneScores.length > 0
      ? Number((phoneScores.reduce((a, b) => a + b, 0) / phoneScores.length).toFixed(2))
      : 0.7;

    // Lighting Baseline across steps
    const allLighting = screenSamples.map(s => s.lightingScore || 0.5);
    const lightingBaseline = allLighting.length > 0
      ? Math.round((allLighting.reduce((a, b) => a + b, 0) / allLighting.length) * 255)
      : 128;

    // Study zone bounding box learned from screen and paper steps
    const validBoxes = screenSamples.concat(paperSamples).filter(s => s.faceBox).map(s => s.faceBox!);
    let minX = 15;
    let maxX = 85;
    let minY = 10;
    let maxY = 85;
    if (validBoxes.length > 0) {
      minX = Math.max(5, Math.min(...validBoxes.map(b => b.x)) - 10);
      maxX = Math.min(95, Math.max(...validBoxes.map(b => b.x + b.width)) + 10);
      minY = Math.max(5, Math.min(...validBoxes.map(b => b.y)) - 10);
      maxY = Math.min(95, Math.max(...validBoxes.map(b => b.y + b.height)) + 10);
    }

    const newProfile: CalibrationProfile = {
      isCalibrated: true,
      calibratedAt: Date.now(),
      baselineScreenYaw,
      baselineScreenPitch,
      baselinePaperYaw,
      baselinePaperPitch,
      deskYRatio: 0.55,
      lightingBaseline,
      faceBoundingBoxRatio: 0.45,
      torsoCentroid: { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2) },
      phoneBaselineScore,
      studyZone: {
        minX,
        maxX,
        minY,
        maxY,
        baselineCentroid: { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2) }
      },
      tolerances: {
        yawTolerance,
        pitchTolerance: Math.abs(baselinePaperPitch - baselineScreenPitch) + 12,
        awayToleranceSeconds: 10,
        phoneGraceSeconds: 10,
        conversationGraceSeconds: 12,
        sleepGraceSeconds: 35
      }
    };

    this.saveProfile(newProfile);
    this.currentStep = 0;
    return newProfile;
  }

  saveProfile(profile: CalibrationProfile): void {
    this.profile = profile;
    StorageService.saveCalibrationProfile(profile);
  }

  reset(): void {
    this.profile = { ...DEFAULT_CALIBRATION_PROFILE };
    StorageService.saveCalibrationProfile(this.profile);
    this.currentStep = 0;
    this.stepSamples.clear();
  }
}

export const calibrationEngine = new CalibrationEngine();
