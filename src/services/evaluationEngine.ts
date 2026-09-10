import { EvaluationConfusionMatrix, EvaluationMetrics, FocusEngineSettings, VisionData, ActivityData } from '../types';
import { FocusEngine } from './focusEngine';
import { DEFAULT_FOCUS_SETTINGS } from '../constants';
import { StorageService } from './storage';

export interface EvaluationScenario {
  name: string;
  category: 'Screen Study' | 'Paper / PYQ Study' | 'Normal Study Movement' | 'Distraction & Absence';
  expectedFocus: boolean; // True if user is studying (should NOT be paused), False if actual distraction/absence
  expectedState: string;
  studyMedium: 'Screen Study' | 'Paper / PYQ Study' | 'Mixed Study';
  steps: Array<{
    vision: Partial<VisionData>;
    activity: Partial<ActivityData>;
    durationMs: number;
  }>;
}

export const BENCHMARK_SCENARIOS: EvaluationScenario[] = [
  {
    name: 'Screen Reading (Lecture slides)',
    category: 'Screen Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.95, headYaw: 2, headPitch: -2, gazeScore: 0.92, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 40, activeApp: 'PDF Reader' },
        durationMs: 4000
      }
    ]
  },
  {
    name: 'Screen Typing & Coding',
    category: 'Screen Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.96, headYaw: -1, headPitch: -4, gazeScore: 0.95, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: true, idleSeconds: 0, activeApp: 'Visual Studio Code' },
        durationMs: 4000
      }
    ]
  },
  {
    name: 'Paper Reading (Syllabus/Notes)',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.92, headYaw: 2, headPitch: -18, isLookingDown: true, bodyPostureStable: true, handActivity: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 120, activeApp: 'Visual Studio Code' },
        durationMs: 5000
      }
    ]
  },
  {
    name: 'Solving GATE PYQ on Paper (Writing bursts)',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.94, headYaw: -2, headPitch: -22, isLookingDown: true, handActivity: true, deskActivityScore: 0.75, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 180, activeApp: 'gateoverflow.in' },
        durationMs: 6000
      }
    ]
  },
  {
    name: 'Thinking Looking Down at Notebook',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.90, headYaw: 1, headPitch: -20, isLookingDown: true, handActivity: false, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 150, activeApp: 'gateoverflow.in' },
        durationMs: 5000
      }
    ]
  },
  {
    name: 'Mathematical Derivation & Calculation',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.93, headYaw: 0, headPitch: -19, isLookingDown: true, handActivity: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 240, activeApp: 'Obsidian' },
        durationMs: 5000
      }
    ]
  },
  {
    name: 'Mixed Study (Monitor to Notebook Switching)',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Mixed Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.95, headYaw: 0, headPitch: -2, gazeScore: 0.9, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: false, idleSeconds: 1, activeApp: 'Visual Studio Code' },
        durationMs: 2000
      },
      {
        vision: { facePresent: true, confidence: 0.93, headYaw: -2, headPitch: -18, isLookingDown: true, handActivity: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 15, activeApp: 'Visual Studio Code' },
        durationMs: 4000
      }
    ]
  },
  {
    name: 'Drinking Water at Desk',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.85, headYaw: 8, headPitch: 12, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 60, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  {
    name: 'Brief Glance Sideways (At physical textbook)',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'UNCERTAIN',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.88, headYaw: 26, headPitch: -6, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 50, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  {
    name: 'Posture Adjustment / Chair Stretch',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.82, headYaw: -6, headPitch: 8, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 80, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  {
    name: 'Low Light Study Environment',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.78, lightingLevel: 'low', lightingScore: 0.22, headPitch: -15, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 100, activeApp: 'gateoverflow.in' },
        durationMs: 3000
      }
    ]
  },
  {
    name: 'Leaving Workstation (Confirmed Absence)',
    category: 'Distraction & Absence',
    expectedFocus: false,
    expectedState: 'AWAY',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: false, confidence: 0.0, headYaw: 0, headPitch: 0, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 120, activeApp: 'gateoverflow.in' },
        durationMs: 11000 // Exceeds 8s away threshold
      }
    ]
  },
  {
    name: 'Distraction Application Active (Casual browsing/gaming)',
    category: 'Distraction & Absence',
    expectedFocus: false,
    expectedState: 'PAUSED',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.9, headYaw: -15, headPitch: 0, gazeScore: 0.5, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: true, idleSeconds: 0, activeApp: 'Steam / Games' },
        durationMs: 7000 // Exceeds distraction grace period
      }
    ]
  }
];

export class EvaluationEngine {
  static runAllTests(customSettings?: Partial<FocusEngineSettings>): EvaluationMetrics {
    const settings: FocusEngineSettings = {
      ...DEFAULT_FOCUS_SETTINGS,
      ...customSettings
    };

    let truePositive = 0;
    let falsePositive = 0;
    let trueNegative = 0;
    let falseNegative = 0;
    let falsePauseCount = 0;
    let totalFocusScenarios = 0;

    const scenarioResults: EvaluationMetrics['scenarioResults'] = [];

    BENCHMARK_SCENARIOS.forEach(sc => {
      const engine = new FocusEngine({
        ...settings,
        studyMedium: sc.studyMedium
      });

      // Start engine in appropriate state
      const initialState = sc.studyMedium === 'Paper / PYQ Study' ? 'FOCUSED_PAPER' : 'FOCUSED_SCREEN';
      engine.setState(initialState, 'Evaluation scenario test start');

      // Feed simulation steps
      let finalState = initialState;

      let simTime = Date.now();
      sc.steps.forEach(step => {
        const frameCount = Math.max(1, Math.round(step.durationMs / 100));
        const dt = Math.round(step.durationMs / frameCount);

        for (let i = 0; i < frameCount; i++) {
          simTime += dt;
          const fullVision: VisionData = {
            facePresent: step.vision.facePresent ?? true,
            confidence: step.vision.confidence ?? 0.95,
            headYaw: step.vision.headYaw ?? 0,
            headPitch: step.vision.headPitch ?? -4,
            headRoll: 0,
            eyeOpen: step.vision.eyeOpen ?? true,
            gazeScore: step.vision.gazeScore ?? 0.9,
            handActivity: step.vision.handActivity ?? false,
            bodyPostureStable: step.vision.bodyPostureStable ?? true,
            deskActivityScore: step.vision.deskActivityScore ?? 0.2,
            isLookingDown: step.vision.isLookingDown ?? (step.vision.headPitch ? step.vision.headPitch < -8 : false),
            lightingLevel: step.vision.lightingLevel ?? 'normal',
            lightingScore: step.vision.lightingScore ?? 0.65,
            faceCount: step.vision.faceCount ?? 1,
            cameraHealthy: true,
            timestamp: simTime
          };

          const fullActivity: ActivityData = {
            keyboardActive: step.activity.keyboardActive ?? false,
            mouseActive: step.activity.mouseActive ?? false,
            idleSeconds: step.activity.idleSeconds ?? 0,
            activeApp: step.activity.activeApp ?? 'Visual Studio Code',
            isWindowFocused: true,
            lastActivityTimestamp: simTime
          };

          engine.updateVision(fullVision);
          engine.updateActivity(fullActivity);
        }

        finalState = engine.getState();
      });

      // Check result
      const isPredictedFocus =
        finalState === 'FOCUSED' ||
        finalState === 'FOCUSED_SCREEN' ||
        finalState === 'FOCUSED_PAPER' ||
        finalState === 'FOCUSED_MIXED' ||
        finalState === 'UNCERTAIN' ||
        finalState === 'WARNING';

      const isActualFocus = sc.expectedFocus;

      if (isActualFocus) {
        totalFocusScenarios++;
        if (finalState === 'PAUSED') {
          falsePauseCount++;
        }
      }

      let passed = false;
      if (isActualFocus && isPredictedFocus) {
        truePositive++;
        passed = true;
      } else if (!isActualFocus && !isPredictedFocus) {
        trueNegative++;
        passed = true;
      } else if (!isActualFocus && isPredictedFocus) {
        falsePositive++;
      } else if (isActualFocus && !isPredictedFocus) {
        falseNegative++;
      }

      scenarioResults.push({
        name: sc.name,
        category: sc.category,
        expectedState: sc.expectedState,
        actualState: finalState,
        passed,
        details: passed
          ? `Correctly identified as ${finalState}`
          : `Expected ${sc.expectedState} (${isActualFocus ? 'Focus' : 'Distraction/Away'}), got ${finalState}`
      });
    });

    const total = truePositive + falsePositive + trueNegative + falseNegative;
    const accuracy = total > 0 ? Number(((truePositive + trueNegative) / total).toFixed(4)) : 1.0;
    const precision = (truePositive + falsePositive) > 0 ? Number((truePositive / (truePositive + falsePositive)).toFixed(4)) : 1.0;
    const recall = (truePositive + falseNegative) > 0 ? Number((truePositive / (truePositive + falseNegative)).toFixed(4)) : 1.0;
    const f1Score = (precision + recall) > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 1.0;
    const falsePositiveRate = (falsePositive + trueNegative) > 0 ? Number((falsePositive / (falsePositive + trueNegative)).toFixed(4)) : 0;
    const falseNegativeRate = (falseNegative + truePositive) > 0 ? Number((falseNegative / (falseNegative + truePositive)).toFixed(4)) : 0;
    const falsePauseRate = totalFocusScenarios > 0 ? Number((falsePauseCount / totalFocusScenarios).toFixed(4)) : 0;

    const confusionMatrix: EvaluationConfusionMatrix = {
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative
    };

    const metrics: EvaluationMetrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      falsePositiveRate,
      falseNegativeRate,
      falsePauseRate,
      confusionMatrix,
      totalScenarios: BENCHMARK_SCENARIOS.length,
      passedScenarios: scenarioResults.filter(r => r.passed).length,
      timestamp: Date.now(),
      scenarioResults
    };

    StorageService.saveEvaluationMetrics(metrics);
    return metrics;
  }
}
