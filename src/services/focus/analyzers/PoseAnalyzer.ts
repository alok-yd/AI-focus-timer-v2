import { CalibrationProfile, VisionData } from '../../../types';
import { FaceAnalysisResult } from './FaceAnalyzer';

export interface PoseAnalysisResult {
  headYaw: number;
  headPitch: number;
  headRoll: number;
  isLookingDown: boolean;
  isPitchCompatibleWithPaper: boolean;
  isYawWithinStudyTolerance: boolean;
  isSeatedPostureStable: boolean;
  inStudyZone: boolean;
  bodyPresence: boolean;
  postureScore: number;
}

export class PoseAnalyzer {
  analyze(vision: VisionData, profile: CalibrationProfile, face: FaceAnalysisResult): PoseAnalysisResult {
    const headYaw = vision.headYaw ?? 0;
    const headPitch = vision.headPitch ?? -4;
    const headRoll = vision.headRoll ?? 0;
    const isSeatedPostureStable = vision.bodyPostureStable ?? true;

    const yawTolerance = profile.isCalibrated ? profile.tolerances.yawTolerance : 30;
    const pitchTolerance = profile.isCalibrated ? profile.tolerances.pitchTolerance : 22;
    const baselinePaperPitch = profile.isCalibrated ? profile.baselinePaperPitch : -18;
    const baselineScreenPitch = profile.isCalibrated ? profile.baselineScreenPitch : -4;

    // Looking down check: negative angle beyond threshold (-8° or calibrated paper pitch boundary)
    const paperThreshold = Math.min(-8, baselinePaperPitch + 6);
    const isLookingDown = headPitch <= paperThreshold || (vision.isLookingDown ?? false);

    // Is pitch naturally aligned with desk / notebook solving?
    const isPitchCompatibleWithPaper = isLookingDown || Math.abs(headPitch - baselinePaperPitch) <= pitchTolerance;

    // Is yaw within workstation study zone?
    const absYaw = Math.abs(headYaw);
    const isYawWithinStudyTolerance = absYaw <= yawTolerance;

    // Study zone bounds evaluation:
    let inStudyZone = true;
    if (profile.studyZone && vision.faceBox) {
      const fb = vision.faceBox;
      const sz = profile.studyZone;
      inStudyZone = (fb.x + fb.width / 2 >= sz.minX) &&
                    (fb.x + fb.width / 2 <= sz.maxX) &&
                    (fb.y + fb.height / 2 >= sz.minY) &&
                    (fb.y + fb.height / 2 <= sz.maxY);
    } else {
      // Default: face centroid within 10% to 90% of camera field
      if (vision.faceBox) {
        const cx = vision.faceBox.x + vision.faceBox.width / 2;
        inStudyZone = cx >= 10 && cx <= 90;
      } else {
        inStudyZone = face.facePresent;
      }
    }

    const bodyPresence = face.facePresent || isSeatedPostureStable;

    // Continuous posture score (0 to 100)
    let postureScore = 70;
    if (bodyPresence && inStudyZone) {
      postureScore += 15;
      if (isSeatedPostureStable) postureScore += 15;
    } else {
      postureScore = 15;
    }

    return {
      headYaw,
      headPitch,
      headRoll,
      isLookingDown,
      isPitchCompatibleWithPaper,
      isYawWithinStudyTolerance,
      isSeatedPostureStable,
      inStudyZone,
      bodyPresence,
      postureScore: Math.min(100, Math.max(0, postureScore))
    };
  }
}

export const poseAnalyzer = new PoseAnalyzer();
