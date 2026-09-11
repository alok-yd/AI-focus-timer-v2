import { CalibrationProfile, VisionData, ActivityData } from '../../../types';
import { FaceAnalysisResult } from './FaceAnalyzer';
import { PoseAnalysisResult } from './PoseAnalyzer';
import { HandAnalysisResult } from './HandAnalyzer';

export interface SleepAnalysisResult {
  sleepConfidence: number;
  isPossibleRest: boolean;
  isPossibleSleepWarning: boolean;
  isConfirmedSleepPause: boolean;
  sleepDurationSeconds: number;
  reason?: string;
}

export class SleepAnalyzer {
  private sleepStartTime: number | null = null;
  private sleepHistory: number[] = [];

  analyze(
    vision: VisionData,
    profile: CalibrationProfile,
    face: FaceAnalysisResult,
    pose: PoseAnalysisResult,
    hand: HandAnalysisResult,
    activity: ActivityData
  ): SleepAnalysisResult {
    const now = vision.timestamp || Date.now();
    const sleepGraceSeconds = profile.tolerances?.sleepGraceSeconds ?? 35;
    const warningThresholdSeconds = Math.max(15, Math.floor(sleepGraceSeconds * 0.6));
    const restThresholdSeconds = 8;

    // Confluence of signals required:
    // 1. Person is present at desk (not absent)
    // 2. Eyes closed OR head deeply drooped forward
    // 3. Zero desk motion
    // 4. Seated posture is completely stationary
    // 5. Zero keyboard or mouse input
    const eyesClosedOrFaceLow = !face.eyeOpen || face.isDeepHeadDown || face.visibilityCategory === 'LOW_VISIBILITY';
    const noMovement = !hand.handActivity && activity.idleSeconds >= 8;
    const stableStationary = pose.isSeatedPostureStable && pose.bodyPresence;

    let instantSleepScore = 0.0;
    if (stableStationary && eyesClosedOrFaceLow && noMovement) {
      if (!face.eyeOpen && face.isDeepHeadDown) {
        instantSleepScore = 0.95;
      } else if (!face.eyeOpen) {
        instantSleepScore = 0.85;
      } else if (face.isDeepHeadDown && noMovement) {
        instantSleepScore = 0.65;
      } else {
        instantSleepScore = 0.50;
      }
    } else {
      instantSleepScore = 0.05;
    }

    this.sleepHistory.push(instantSleepScore);
    if (this.sleepHistory.length > 10) this.sleepHistory.shift();

    const sleepConfidence = this.sleepHistory.reduce((a, b) => a + b, 0) / this.sleepHistory.length;
    const isSleepingConditionMet = sleepConfidence >= 0.55;

    let sleepDurationSeconds = 0;
    let isPossibleRest = false;
    let isPossibleSleepWarning = false;
    let isConfirmedSleepPause = false;
    let reason: string | undefined;

    if (isSleepingConditionMet) {
      if (this.sleepStartTime === null) {
        this.sleepStartTime = now;
      }
      sleepDurationSeconds = Math.max(0, Math.floor((now - this.sleepStartTime) / 1000));

      if (sleepDurationSeconds >= sleepGraceSeconds && sleepConfidence >= 0.70) {
        isConfirmedSleepPause = true;
        reason = `Prolonged rest/sleep posture detected for ${sleepDurationSeconds}s`;
      } else if (sleepDurationSeconds >= warningThresholdSeconds) {
        isPossibleSleepWarning = true;
        reason = `Possible rest or fatigue detected (${sleepDurationSeconds}s)`;
      } else if (sleepDurationSeconds >= restThresholdSeconds) {
        isPossibleRest = true;
        reason = `Stationary rest posture observed (${sleepDurationSeconds}s)`;
      }
    } else {
      // Immediate reset on purposeful physical movement
      if (activity.keyboardActive || activity.mouseActive || hand.isWritingBurst) {
        this.sleepStartTime = null;
      } else if (sleepConfidence < 0.35) {
        this.sleepStartTime = null;
      }
    }

    return {
      sleepConfidence: Number(sleepConfidence.toFixed(2)),
      isPossibleRest,
      isPossibleSleepWarning,
      isConfirmedSleepPause,
      sleepDurationSeconds,
      reason
    };
  }

  reset(): void {
    this.sleepStartTime = null;
    this.sleepHistory = [];
  }
}

export const sleepAnalyzer = new SleepAnalyzer();
