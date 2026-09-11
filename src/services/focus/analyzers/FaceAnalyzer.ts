import { CalibrationProfile, FaceVisibilityCategory, VisionData } from '../../../types';

export interface FaceAnalysisResult {
  facePresent: boolean;
  confidence: number;
  visibilityCategory: FaceVisibilityCategory;
  faceBox?: { x: number; y: number; width: number; height: number };
  eyeOpen: boolean;
  gazeScore: number;
  isDeepHeadDown: boolean;
  lightingLevel: 'dark' | 'low' | 'normal' | 'bright';
  lightingScore: number;
  faceCount: number;
}

export class FaceAnalyzer {
  analyze(vision: VisionData, profile: CalibrationProfile): FaceAnalysisResult {
    const facePresent = vision.facePresent;
    const confidence = vision.confidence ?? 0;
    const lightingLevel = vision.lightingLevel ?? 'normal';
    const lightingScore = vision.lightingScore ?? 0.6;
    const faceCount = vision.faceCount ?? (facePresent ? 1 : 0);

    // Determine visibility category without crude thresholding
    let visibilityCategory: FaceVisibilityCategory = 'LOW_VISIBILITY';
    if (facePresent) {
      if (confidence >= 0.80 && lightingLevel !== 'dark') {
        visibilityCategory = 'HIGH_VISIBILITY';
      } else if (confidence >= 0.45 || lightingLevel === 'low') {
        visibilityCategory = 'MEDIUM_VISIBILITY';
      } else {
        visibilityCategory = 'LOW_VISIBILITY';
      }
    } else {
      visibilityCategory = 'LOW_VISIBILITY';
    }

    const baselinePaperPitch = profile.isCalibrated ? profile.baselinePaperPitch : -18;
    const isDeepHeadDown = vision.headPitch < (baselinePaperPitch - 8);

    return {
      facePresent,
      confidence,
      visibilityCategory,
      faceBox: vision.faceBox,
      eyeOpen: vision.eyeOpen ?? true,
      gazeScore: vision.gazeScore ?? 0.9,
      isDeepHeadDown,
      lightingLevel,
      lightingScore,
      faceCount
    };
  }
}

export const faceAnalyzer = new FaceAnalyzer();
