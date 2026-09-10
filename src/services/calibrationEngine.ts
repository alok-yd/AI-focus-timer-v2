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
  tolerances: {
    yawTolerance: 30,
    pitchTolerance: 22,
    awayToleranceSeconds: 10
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
    title: 'Screen Study Posture',
    durationSeconds: 15,
    instructions: 'Look normally at your monitor as if reading code or study slides.',
    expectedState: 'FOCUSED_SCREEN'
  },
  {
    step: 2,
    title: 'Paper Reading Posture',
    durationSeconds: 15,
    instructions: 'Look down naturally at your notebook or syllabus printout.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 3,
    title: 'Writing & Solving PYQ',
    durationSeconds: 20,
    instructions: 'Hold a pen and write calculations or notes on paper at your desk.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 4,
    title: 'Quiet Thinking Looking Down',
    durationSeconds: 15,
    instructions: 'Rest hands still, looking downward thinking through a GATE problem.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 5,
    title: 'Looking Sideways Briefly',
    durationSeconds: 10,
    instructions: 'Glance briefly to your left or right (e.g. at a calculator or reference book).',
    expectedState: 'UNCERTAIN'
  },
  {
    step: 6,
    title: 'Drink Water / Posture Shift',
    durationSeconds: 10,
    instructions: 'Take a sip of water or stretch gently in your study chair.',
    expectedState: 'FOCUSED_PAPER'
  },
  {
    step: 7,
    title: 'Step Away from Desk',
    durationSeconds: 10,
    instructions: 'Step out of camera view so the detector learns your empty workstation baseline.',
    expectedState: 'AWAY'
  },
  {
    step: 8,
    title: 'Return to Desk',
    durationSeconds: 10,
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
    if (this.currentStep < 1 || this.currentStep > 8) return;
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
      torsoCentroid: { x: sample.faceBox ? sample.faceBox.x + sample.faceBox.width / 2 : 80, y: 70 },
      tolerances: {
        yawTolerance: 30,
        pitchTolerance: 22,
        awayToleranceSeconds: 10
      }
    };

    this.saveProfile(newProfile);
    return newProfile;
  }

  /**
   * Finalize all 8 steps and calculate optimized, robust profile
   */
  finalizeCalibration(): CalibrationProfile {
    // Step 1: Screen posture
    const step1 = this.stepSamples.get(1) || [];
    const screenYaws = step1.map(s => s.headYaw);
    const screenPitches = step1.map(s => s.headPitch);
    const baselineScreenYaw = screenYaws.length > 0 ? Math.round(screenYaws.reduce((a, b) => a + b, 0) / screenYaws.length) : 0;
    const baselineScreenPitch = screenPitches.length > 0 ? Math.round(screenPitches.reduce((a, b) => a + b, 0) / screenPitches.length) : -4;

    // Step 2: Paper reading posture
    const step2 = this.stepSamples.get(2) || [];
    const paperPitches = step2.map(s => s.headPitch);
    const baselinePaperPitch = paperPitches.length > 0 ? Math.round(paperPitches.reduce((a, b) => a + b, 0) / paperPitches.length) : -18;
    const paperYaws = step2.map(s => s.headYaw);
    const baselinePaperYaw = paperYaws.length > 0 ? Math.round(paperYaws.reduce((a, b) => a + b, 0) / paperYaws.length) : 0;

    // Step 5: Sideways tolerance
    const step5 = this.stepSamples.get(5) || [];
    const sidewaysYaws = step5.map(s => Math.abs(s.headYaw));
    const maxSidewaysYaw = sidewaysYaws.length > 0 ? Math.max(...sidewaysYaws) : 32;
    const yawTolerance = Math.min(45, Math.max(25, maxSidewaysYaw + 5));

    // Lighting
    const allLighting = [...(step1 || []), ...(step2 || [])].map(s => s.lightingScore || 0.5);
    const lightingBaseline = allLighting.length > 0
      ? Math.round((allLighting.reduce((a, b) => a + b, 0) / allLighting.length) * 255)
      : 128;

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
      torsoCentroid: { x: 80, y: 70 },
      tolerances: {
        yawTolerance,
        pitchTolerance: Math.abs(baselinePaperPitch - baselineScreenPitch) + 12,
        awayToleranceSeconds: 10
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
