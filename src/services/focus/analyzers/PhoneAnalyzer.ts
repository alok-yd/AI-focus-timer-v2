import { CalibrationProfile, VisionData, ActivityData } from '../../../types';
import { PoseAnalysisResult } from './PoseAnalyzer';
import { HandAnalysisResult } from './HandAnalyzer';

export interface PhoneAnalysisResult {
  phoneConfidence: number; // 0.0 to 1.0
  isPossiblePhoneUse: boolean;
  isPhoneWarning: boolean;
  isPersistentPhoneUse: boolean;
  phoneDurationSeconds: number;
  reason?: string;
}

export class PhoneAnalyzer {
  private phoneHistory: number[] = [];
  private phoneStartTime: number | null = null;

  analyze(
    vision: VisionData,
    profile: CalibrationProfile,
    pose: PoseAnalysisResult,
    hand: HandAnalysisResult,
    activity: ActivityData
  ): PhoneAnalysisResult {
    const now = vision.timestamp || Date.now();
    const phoneGraceSeconds = profile.tolerances?.phoneGraceSeconds ?? 10;
    const warningGraceSeconds = Math.max(3, Math.floor(phoneGraceSeconds / 2));

    // 1. Instantaneous phone likelihood feature extraction
    let instantaneousScore = 0.0;

    // Explicit vision sensor score (if available)
    if (vision.phoneDetectedScore !== undefined) {
      instantaneousScore = vision.phoneDetectedScore;
    } else {
      // Heuristic multi-signal estimation for local webcams:
      // Phone posture characteristics:
      // A) Head tilted downward, but gaze/focus is concentrated above lap or hand near chest (not wide desk paper)
      // B) Hand activity present without typing/mouse or paper writing bursts
      // C) Computer idle
      let postureIndicators = 0;

      // Computer is idle while student is looking down
      if (activity.idleSeconds > 10 && pose.isLookingDown) {
        postureIndicators += 0.25;
      }

      // Hand is active but NOT writing in notebook (e.g. thumb scrolling)
      if (hand.handActivity && !hand.isWritingBurst && vision.deskActivityScore < 0.25) {
        postureIndicators += 0.35;
      }

      // Head roll / lateral tilt while looking down (holding phone to ear or leaning head on hand looking at screen)
      if (Math.abs(pose.headRoll) > 14 && pose.isLookingDown) {
        postureIndicators += 0.30;
      }

      // High yaw while looking down (looking at phone on desk next to keyboard)
      if (Math.abs(pose.headYaw) > 25 && pose.isLookingDown && !hand.isWritingBurst) {
        postureIndicators += 0.20;
      }

      instantaneousScore = Math.min(0.95, postureIndicators);
    }

    // 2. Temporal rolling window smoothing (last 10 samples)
    this.phoneHistory.push(instantaneousScore);
    if (this.phoneHistory.length > 10) this.phoneHistory.shift();

    const smoothedPhoneConfidence =
      this.phoneHistory.reduce((a, b) => a + b, 0) / this.phoneHistory.length;

    const isPossiblePhoneUse = smoothedPhoneConfidence >= 0.50;

    let phoneDurationSeconds = 0;
    let isPhoneWarning = false;
    let isPersistentPhoneUse = false;
    let reason: string | undefined;

    if (isPossiblePhoneUse) {
      if (this.phoneStartTime === null) {
        this.phoneStartTime = now;
      }
      phoneDurationSeconds = Math.max(0, Math.floor((now - this.phoneStartTime) / 1000));

      if (phoneDurationSeconds >= phoneGraceSeconds && smoothedPhoneConfidence >= 0.70) {
        isPersistentPhoneUse = true;
        reason = `Persistent smartphone use detected for ${phoneDurationSeconds}s`;
      } else if (phoneDurationSeconds >= warningGraceSeconds) {
        isPhoneWarning = true;
        reason = `Potential phone interaction in progress (${phoneDurationSeconds}s)`;
      } else {
        reason = 'Brief smartphone interaction suspected';
      }
    } else {
      // Cooldown: reset if phone confidence drops below 0.35
      if (smoothedPhoneConfidence < 0.35) {
        this.phoneStartTime = null;
      }
    }

    return {
      phoneConfidence: Number(smoothedPhoneConfidence.toFixed(2)),
      isPossiblePhoneUse,
      isPhoneWarning,
      isPersistentPhoneUse,
      phoneDurationSeconds,
      reason
    };
  }

  reset(): void {
    this.phoneHistory = [];
    this.phoneStartTime = null;
  }
}

export const phoneAnalyzer = new PhoneAnalyzer();
