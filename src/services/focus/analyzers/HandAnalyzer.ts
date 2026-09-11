import { CalibrationProfile, VisionData } from '../../../types';
import { PoseAnalysisResult } from './PoseAnalyzer';

export interface HandAnalysisResult {
  handPresence: boolean;
  handActivity: boolean;
  deskActivityScore: number;
  isWritingBurst: boolean;
  isThinkingPause: boolean;
  secondsSinceLastMovement: number;
  deskScore: number;
}

export class HandAnalyzer {
  private lastHandMovementTime: number = Date.now();
  private hadRecentWritingBurst: boolean = false;

  analyze(vision: VisionData, _profile: CalibrationProfile, pose: PoseAnalysisResult): HandAnalysisResult {
    const now = vision.timestamp || Date.now();
    const rawDeskActivity = vision.deskActivityScore ?? (vision.handActivity ? 0.7 : 0.1);
    const instantMotion = vision.handActivity || rawDeskActivity > 0.25;

    if (instantMotion) {
      this.lastHandMovementTime = now;
      this.hadRecentWritingBurst = true;
    }

    const elapsedSeconds = Math.max(0, Math.floor((now - this.lastHandMovementTime) / 1000));
    
    // Recent hand activity: within last 45 seconds
    const handActivity = elapsedSeconds <= 45;

    // Writing burst: immediate high movement in desk quadrant
    const isWritingBurst = instantMotion && rawDeskActivity > 0.4;

    // Thinking pause: hands still for 5 to 120 seconds, preceded by writing, with head still looking down at desk
    const isThinkingPause =
      pose.isLookingDown &&
      pose.bodyPresence &&
      pose.isSeatedPostureStable &&
      this.hadRecentWritingBurst &&
      elapsedSeconds >= 3 &&
      elapsedSeconds <= 120;

    // Reset writing burst flag if inactive for > 180s
    if (elapsedSeconds > 180) {
      this.hadRecentWritingBurst = false;
    }

    // Desk score (0 to 100)
    let deskScore = 50;
    if (isWritingBurst) {
      deskScore = 95;
    } else if (isThinkingPause) {
      // High score for contemplation during problem solving
      deskScore = 85;
    } else if (handActivity) {
      deskScore = 75;
    } else {
      deskScore = 60;
    }

    return {
      handPresence: instantMotion || handActivity,
      handActivity,
      deskActivityScore: rawDeskActivity,
      isWritingBurst,
      isThinkingPause,
      secondsSinceLastMovement: elapsedSeconds,
      deskScore
    };
  }

  reset(): void {
    this.lastHandMovementTime = Date.now();
    this.hadRecentWritingBurst = false;
  }
}

export const handAnalyzer = new HandAnalyzer();
