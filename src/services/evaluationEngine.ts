import { EvaluationConfusionMatrix, EvaluationMetrics, FocusEngineSettings, VisionData, ActivityData } from '../types';
import { FocusEngine } from './focusEngine';
import { DEFAULT_FOCUS_SETTINGS } from '../constants';
import { StorageService } from './storage';

export interface EvaluationScenario {
  name: string;
  category: 'Screen Study' | 'Paper / PYQ Study' | 'Normal Study Movement' | 'Distraction & Threats' | 'Environmental & Hardware';
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
  // 1. Screen reading
  {
    name: '1. Screen Reading (Lecture slides)',
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
  // 2. Screen typing
  {
    name: '2. Screen Typing & Coding',
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
  // 3. Educational video
  {
    name: '3. Educational Video (Algorithms Lecture)',
    category: 'Screen Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.94, headYaw: 0, headPitch: -3, gazeScore: 0.90, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 180, activeApp: 'YouTube - NPTEL Algorithms' },
        durationMs: 4000
      }
    ]
  },
  // 4. Paper reading
  {
    name: '4. Paper Reading (Textbook/Syllabus)',
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
  // 5. Writing
  {
    name: '5. Writing (Notes in notebook)',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.95, headYaw: -2, headPitch: -20, isLookingDown: true, handActivity: true, deskActivityScore: 0.8, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 60, activeApp: 'Obsidian' },
        durationMs: 5000
      }
    ]
  },
  // 6. GATE PYQ solving
  {
    name: '6. GATE PYQ Solving (Bursts of writing)',
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
  // 7. Mathematics calculations
  {
    name: '7. Mathematics Calculations',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.93, headYaw: 0, headPitch: -19, isLookingDown: true, handActivity: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 240, activeApp: 'gateoverflow.in' },
        durationMs: 5000
      }
    ]
  },
  // 8. Head down for 30 seconds
  {
    name: '8. Head Down for 30 Seconds',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.91, headYaw: 1, headPitch: -18, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 30, activeApp: 'gateoverflow.in' },
        durationMs: 5000
      }
    ]
  },
  // 9. Head down for 2 minutes
  {
    name: '9. Head Down for 2 Minutes',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.90, headYaw: -1, headPitch: -20, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 120, activeApp: 'gateoverflow.in' },
        durationMs: 5000
      }
    ]
  },
  // 10. Head down for 5 minutes
  {
    name: '10. Head Down for 5 Minutes',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.89, headYaw: 2, headPitch: -21, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 300, activeApp: 'gateoverflow.in' },
        durationMs: 6000
      }
    ]
  },
  // 11. Thinking silently
  {
    name: '11. Thinking Silently at Desk',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'THINKING',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.92, headYaw: 0, headPitch: -16, isLookingDown: true, handActivity: false, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 75, activeApp: 'gateoverflow.in' },
        durationMs: 5000
      }
    ]
  },
  // 12. Looking sideways
  {
    name: '12. Looking Sideways (Physical textbook reference)',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'UNCERTAIN',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.88, headYaw: 26, headPitch: -6, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 50, activeApp: 'gateoverflow.in' },
        durationMs: 2500
      }
    ]
  },
  // 13. Looking down
  {
    name: '13. Looking Down (Deep notebook focus)',
    category: 'Paper / PYQ Study',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.93, headYaw: 0, headPitch: -22, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 90, activeApp: 'gateoverflow.in' },
        durationMs: 4000
      }
    ]
  },
  // 14. Drinking water
  {
    name: '14. Drinking Water at Desk',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.85, headYaw: 6, headPitch: 12, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 40, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  // 15. Stretching
  {
    name: '15. Stretching in Study Chair',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.82, headYaw: -8, headPitch: 8, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 60, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  // 16. Posture adjustment
  {
    name: '16. Posture Adjustment',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.86, headYaw: 4, headPitch: -10, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 70, activeApp: 'gateoverflow.in' },
        durationMs: 2000
      }
    ]
  },
  // 17. Temporary face occlusion
  {
    name: '17. Temporary Face Occlusion (Scratching chin / rubbing eyes)',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.65, headYaw: 0, headPitch: -14, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 80, activeApp: 'gateoverflow.in' },
        durationMs: 2500
      }
    ]
  },
  // 18. Phone use
  {
    name: '18. Phone Use (Prolonged smartphone interaction)',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'PHONE_USE',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.88, headYaw: 25, headPitch: -15, phoneDetectedScore: 0.85, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 15, activeApp: 'Visual Studio Code' },
        durationMs: 12000 // Exceeds phone grace period
      }
    ]
  },
  // 19. Phone held near face
  {
    name: '19. Phone Held Near Face',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'PHONE_USE',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.85, headYaw: 20, headRoll: 18, headPitch: -8, phoneDetectedScore: 0.82, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 20, activeApp: 'Visual Studio Code' },
        durationMs: 12000
      }
    ]
  },
  // 20. Gaming
  {
    name: '20. Gaming (Active game in foreground)',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'PAUSED',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.92, headYaw: 0, headPitch: -2, gazeScore: 0.75, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: true, idleSeconds: 0, activeApp: 'Steam / Games' },
        durationMs: 7000
      }
    ]
  },
  // 21. Social media
  {
    name: '21. Social Media (Entertainment website active)',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'PAUSED',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.90, headYaw: -5, headPitch: 0, gazeScore: 0.65, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: true, idleSeconds: 0, activeApp: 'Instagram / Social Media' },
        durationMs: 7000
      }
    ]
  },
  // 22. Conversation
  {
    name: '22. Conversation (Confirmed verbal interaction)',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'CONVERSATION',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.90, headYaw: 35, headPitch: 0, mouthMovementScore: 0.75, faceCount: 2, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 30, activeApp: 'Visual Studio Code' },
        durationMs: 14000
      }
    ]
  },
  // 23. Second person entering frame
  {
    name: '23. Second Person in Background (Passive room presence)',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.95, headYaw: 0, headPitch: -4, faceCount: 2, gazeScore: 0.92, mouthMovementScore: 0.05, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: false, idleSeconds: 2, activeApp: 'Visual Studio Code' },
        durationMs: 4000
      }
    ]
  },
  // 24. Leaving desk
  {
    name: '24. Leaving Desk (Confirmed absence)',
    category: 'Distraction & Threats',
    expectedFocus: false,
    expectedState: 'AWAY',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: false, confidence: 0.0, headYaw: 0, headPitch: 0, bodyPostureStable: false },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 120, activeApp: 'gateoverflow.in' },
        durationMs: 11000 // Exceeds away threshold
      }
    ]
  },
  // 25. Returning to desk
  {
    name: '25. Returning to Desk (Stability confirmation)',
    category: 'Normal Study Movement',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.95, headYaw: 0, headPitch: -4, gazeScore: 0.92, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: false, idleSeconds: 1, activeApp: 'Visual Studio Code' },
        durationMs: 4000 // Confirms return
      }
    ]
  },
  // 26. Camera disconnect / failure
  {
    name: '26. Camera Disconnect / Blank Frame',
    category: 'Environmental & Hardware',
    expectedFocus: true, // Should enter UNCERTAIN or UNVERIFIED, NOT false-positive distracted pause
    expectedState: 'UNCERTAIN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: false, confidence: 0.0, cameraHealthy: false, lightingLevel: 'dark', lightingScore: 0.01 },
        activity: { keyboardActive: true, mouseActive: true, idleSeconds: 2, activeApp: 'Visual Studio Code' },
        durationMs: 3000
      }
    ]
  },
  // 27. Low lighting
  {
    name: '27. Low Lighting Environment',
    category: 'Environmental & Hardware',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.78, lightingLevel: 'low', lightingScore: 0.22, headPitch: -16, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 90, activeApp: 'gateoverflow.in' },
        durationMs: 3000
      }
    ]
  },
  // 28. Bright lighting
  {
    name: '28. Bright Lighting / Sunlit Room',
    category: 'Environmental & Hardware',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.94, lightingLevel: 'bright', lightingScore: 0.92, headPitch: -3, headYaw: 0, gazeScore: 0.92, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: false, idleSeconds: 5, activeApp: 'Visual Studio Code' },
        durationMs: 3000
      }
    ]
  },
  // 29. Glasses
  {
    name: '29. Reading with Glasses (Specular reflection)',
    category: 'Environmental & Hardware',
    expectedFocus: true,
    expectedState: 'FOCUSED_SCREEN',
    studyMedium: 'Screen Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.90, headPitch: -4, headYaw: 1, eyeOpen: true, gazeScore: 0.85, bodyPostureStable: true },
        activity: { keyboardActive: true, mouseActive: false, idleSeconds: 10, activeApp: 'Visual Studio Code' },
        durationMs: 3000
      }
    ]
  },
  // 30. Different camera positions
  {
    name: '30. Angled Webcam Mounting Position',
    category: 'Environmental & Hardware',
    expectedFocus: true,
    expectedState: 'FOCUSED_PAPER',
    studyMedium: 'Paper / PYQ Study',
    steps: [
      {
        vision: { facePresent: true, confidence: 0.91, headPitch: -14, headYaw: 12, isLookingDown: true, bodyPostureStable: true },
        activity: { keyboardActive: false, mouseActive: false, idleSeconds: 60, activeApp: 'gateoverflow.in' },
        durationMs: 4000
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
            headRoll: step.vision.headRoll ?? 0,
            eyeOpen: step.vision.eyeOpen ?? true,
            gazeScore: step.vision.gazeScore ?? 0.9,
            handActivity: step.vision.handActivity ?? false,
            bodyPostureStable: step.vision.bodyPostureStable ?? true,
            deskActivityScore: step.vision.deskActivityScore ?? 0.2,
            isLookingDown: step.vision.isLookingDown ?? (step.vision.headPitch ? step.vision.headPitch < -8 : false),
            phoneDetectedScore: step.vision.phoneDetectedScore,
            mouthMovementScore: step.vision.mouthMovementScore,
            lightingLevel: step.vision.lightingLevel ?? 'normal',
            lightingScore: step.vision.lightingScore ?? 0.65,
            faceCount: step.vision.faceCount ?? 1,
            cameraHealthy: step.vision.cameraHealthy ?? true,
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

      // A state counts as focused if it represents active study or benign uncertainty (never paused!)
      const isPredictedFocus =
        finalState === 'FOCUSED' ||
        finalState === 'FOCUSED_SCREEN' ||
        finalState === 'FOCUSED_PAPER' ||
        finalState === 'FOCUSED_MIXED' ||
        finalState === 'THINKING' ||
        finalState === 'UNCERTAIN' ||
        finalState === 'WARNING' ||
        finalState === 'UNVERIFIED';

      const isActualFocus = sc.expectedFocus;

      if (isActualFocus) {
        totalFocusScenarios++;
        if (finalState === 'PAUSED' || finalState === 'DISTRACTED' || finalState === 'AWAY' || finalState === 'PHONE_USE' || finalState === 'CONVERSATION') {
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

    const total = BENCHMARK_SCENARIOS.length;
    const accuracy = total > 0 ? (truePositive + trueNegative) / total : 0;
    const precision = (truePositive + falsePositive) > 0 ? truePositive / (truePositive + falsePositive) : 0;
    const recall = (truePositive + falseNegative) > 0 ? truePositive / (truePositive + falseNegative) : 0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const falsePositiveRate = (falsePositive + trueNegative) > 0 ? falsePositive / (falsePositive + trueNegative) : 0;
    const falseNegativeRate = (falseNegative + truePositive) > 0 ? falseNegative / (falseNegative + truePositive) : 0;
    const falsePauseRate = totalFocusScenarios > 0 ? falsePauseCount / totalFocusScenarios : 0;

    const metrics: EvaluationMetrics = {
      accuracy: Number(accuracy.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1Score.toFixed(3)),
      falsePositiveRate: Number(falsePositiveRate.toFixed(3)),
      falseNegativeRate: Number(falseNegativeRate.toFixed(3)),
      falsePauseRate: Number(falsePauseRate.toFixed(3)),
      confusionMatrix: {
        truePositive,
        falsePositive,
        trueNegative,
        falseNegative
      },
      totalScenarios: total,
      passedScenarios: truePositive + trueNegative,
      timestamp: Date.now(),
      scenarioResults
    };

    StorageService.saveEvaluationMetrics(metrics);
    return metrics;
  }
}
