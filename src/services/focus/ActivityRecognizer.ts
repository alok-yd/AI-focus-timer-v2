import { ActivityType, StudyMedium } from '../../types';
import { FaceAnalysisResult } from './analyzers/FaceAnalyzer';
import { PoseAnalysisResult } from './analyzers/PoseAnalyzer';
import { HandAnalysisResult } from './analyzers/HandAnalyzer';
import { PhoneAnalysisResult } from './analyzers/PhoneAnalyzer';
import { ConversationAnalysisResult } from './analyzers/ConversationAnalyzer';
import { SleepAnalysisResult } from './analyzers/SleepAnalyzer';
import { ComputerActivityAnalysisResult } from './analyzers/ComputerActivityAnalyzer';

export interface ActivityRecognitionResult {
  primaryActivity: ActivityType;
  secondaryActivity?: ActivityType;
  confidence: number; // 0 to 1
  isStudyActivity: boolean;
  explanation: string;
}

export class ActivityRecognizer {
  recognize(
    face: FaceAnalysisResult,
    pose: PoseAnalysisResult,
    hand: HandAnalysisResult,
    phone: PhoneAnalysisResult,
    conv: ConversationAnalysisResult,
    sleep: SleepAnalysisResult,
    comp: ComputerActivityAnalysisResult,
    medium: StudyMedium,
    recentActivity?: ActivityType
  ): ActivityRecognitionResult {
    // 1. Check Workstation Absence (AWAY)
    if (!face.facePresent && !pose.bodyPresence) {
      return {
        primaryActivity: 'AWAY',
        confidence: 0.98,
        isStudyActivity: false,
        explanation: 'Workstation empty; subject absent from camera.'
      };
    }

    // 2. Check Severe Threats (Phone, Conversation, Sleep)
    if (phone.isPersistentPhoneUse || (phone.isPossiblePhoneUse && phone.phoneDurationSeconds >= 8)) {
      return {
        primaryActivity: 'PHONE_USE',
        confidence: phone.phoneConfidence,
        isStudyActivity: false,
        explanation: phone.reason || 'Active smartphone interaction detected.'
      };
    }

    if (conv.isConfirmedConversation) {
      return {
        primaryActivity: 'CONVERSATION',
        confidence: conv.conversationConfidence,
        isStudyActivity: false,
        explanation: conv.reason || 'Active conversation with external person.'
      };
    }

    if (sleep.isConfirmedSleepPause || sleep.isPossibleSleepWarning) {
      return {
        primaryActivity: 'POSSIBLE_SLEEP',
        confidence: sleep.sleepConfidence,
        isStudyActivity: false,
        explanation: sleep.reason || 'Prolonged stationary rest posture with eyes closed.'
      };
    }

    // 3. Normal Ergonomic Movement (Drinking, Stretching, Posture Shifts)
    if (!pose.isSeatedPostureStable && face.facePresent) {
      if (pose.headPitch > 10) {
        return {
          primaryActivity: 'DRINKING',
          confidence: 0.85,
          isStudyActivity: true,
          explanation: 'Drinking water or resting neck posture at study desk.'
        };
      }
      return {
        primaryActivity: 'NORMAL_MOVEMENT',
        confidence: 0.80,
        isStudyActivity: true,
        explanation: 'Ergonomic posture adjustment or chair movement.'
      };
    }

    // 4. Paper and Notebook Study Activities
    if (pose.isLookingDown || pose.isPitchCompatibleWithPaper) {
      // Actively writing / calculating
      if (hand.isWritingBurst) {
        const primary = medium === 'Paper / PYQ Study' ? 'PYQ_SOLVING' : 'PAPER_WRITING';
        return {
          primaryActivity: primary,
          secondaryActivity: 'CALCULATING',
          confidence: 0.94,
          isStudyActivity: true,
          explanation: 'Writing notes and mathematical calculations on paper.'
        };
      }

      // Thinking pause during paper study
      if (hand.isThinkingPause || (recentActivity === 'PYQ_SOLVING' || recentActivity === 'PAPER_WRITING')) {
        if (hand.secondsSinceLastMovement <= 120 && pose.isSeatedPostureStable) {
          return {
            primaryActivity: 'THINKING',
            secondaryActivity: 'PYQ_SOLVING',
            confidence: 0.90,
            isStudyActivity: true,
            explanation: 'Quiet contemplation or mental calculation at notebook.'
          };
        }
      }

      // Paper reading (head down, hands quiet or periodic turn)
      if (face.facePresent && pose.inStudyZone) {
        return {
          primaryActivity: 'PAPER_READING',
          secondaryActivity: 'THINKING',
          confidence: 0.88,
          isStudyActivity: true,
          explanation: 'Reading study material or syllabus notes at desk.'
        };
      }
    }

    // 5. Screen Study Activities
    if (pose.isYawWithinStudyTolerance && !pose.isLookingDown) {
      if (comp.keyboardActive || comp.mouseActive) {
        return {
          primaryActivity: 'SCREEN_TYPING',
          secondaryActivity: 'SCREEN_READING',
          confidence: 0.92,
          isStudyActivity: !comp.isDistractionApp,
          explanation: comp.isDistractionApp
            ? `Active computer interaction in ${comp.activeApp}`
            : 'Typing and interacting with study software on monitor.'
        };
      }

      if (face.gazeScore > 0.65 && face.eyeOpen) {
        return {
          primaryActivity: 'SCREEN_READING',
          confidence: 0.90,
          isStudyActivity: !comp.isDistractionApp,
          explanation: 'Reading lecture slides, problem statements, or documentation on screen.'
        };
      }
    }

    // 6. Mixed switching or note taking
    if (comp.keyboardActive && pose.isLookingDown) {
      return {
        primaryActivity: 'NOTE_TAKING',
        confidence: 0.85,
        isStudyActivity: true,
        explanation: 'Synchronous note-taking and reference viewing.'
      };
    }

    // 7. General thinking / contemplation at desk
    if (face.facePresent && pose.inStudyZone && pose.isSeatedPostureStable) {
      return {
        primaryActivity: 'THINKING',
        confidence: 0.80,
        isStudyActivity: true,
        explanation: 'Attentive contemplation in study zone.'
      };
    }

    return {
      primaryActivity: 'UNKNOWN',
      confidence: 0.50,
      isStudyActivity: true, // Default to benign uncertainty
      explanation: 'Ambiguous posture; observing for further evidence.'
    };
  }
}

export const activityRecognizer = new ActivityRecognizer();
