import { CalibrationProfile, VisionData } from '../../../types';
import { PoseAnalysisResult } from './PoseAnalyzer';
import { FaceAnalysisResult } from './FaceAnalyzer';

export interface ConversationAnalysisResult {
  conversationConfidence: number;
  isPossibleConversation: boolean;
  isConversationWarning: boolean;
  isConfirmedConversation: boolean;
  conversationDurationSeconds: number;
  hasMultiplePeople: boolean;
  isReadingAloudOrSolo: boolean;
  reason?: string;
}

export class ConversationAnalyzer {
  private history: number[] = [];
  private conversationStartTime: number | null = null;

  analyze(
    vision: VisionData,
    profile: CalibrationProfile,
    pose: PoseAnalysisResult,
    face: FaceAnalysisResult
  ): ConversationAnalysisResult {
    const now = vision.timestamp || Date.now();
    const graceSeconds = profile.tolerances?.conversationGraceSeconds ?? 12;
    const warningGraceSeconds = Math.max(4, Math.floor(graceSeconds / 2));

    const faceCount = face.faceCount || vision.faceCount || 1;
    const hasMultiplePeople = faceCount >= 2;
    const absYaw = Math.abs(pose.headYaw);
    const yawTolerance = profile.isCalibrated ? profile.tolerances.yawTolerance : 30;

    const rawMouthMovement = vision.mouthMovementScore ?? 0.0;
    const isMouthActive = rawMouthMovement > 0.4;

    // Distinguish solo reading aloud vs. conversation:
    // If student is facing desk/paper (pitch down) or monitor (yaw normal) with mouth moving,
    // this is normal study behavior (reading definitions aloud, thinking out loud).
    const isFacingWorkstation = pose.isLookingDown || absYaw <= yawTolerance;
    const isReadingAloudOrSolo = isMouthActive && isFacingWorkstation && !hasMultiplePeople;

    let instantScore = 0.0;

    if (hasMultiplePeople) {
      // Second person present in frame + mouth movement or interaction
      instantScore = isMouthActive ? 0.90 : 0.65;
    } else if (absYaw > yawTolerance + 10 && isMouthActive) {
      // Head turned laterally to a person outside frame + speaking
      instantScore = 0.75;
    } else if (absYaw > yawTolerance + 15) {
      // Head turned persistently away
      instantScore = 0.40;
    } else if (isReadingAloudOrSolo) {
      // Read aloud is study! Only a nominal non-zero score to log activity, never enough to trigger conversation
      instantScore = 0.15;
    }

    this.history.push(instantScore);
    if (this.history.length > 10) this.history.shift();

    const conversationConfidence =
      this.history.reduce((a, b) => a + b, 0) / this.history.length;

    const isPossibleConversation = conversationConfidence >= 0.55 && !isReadingAloudOrSolo;

    let conversationDurationSeconds = 0;
    let isConversationWarning = false;
    let isConfirmedConversation = false;
    let reason: string | undefined;

    if (isPossibleConversation) {
      if (this.conversationStartTime === null) {
        this.conversationStartTime = now;
      }
      conversationDurationSeconds = Math.max(0, Math.floor((now - this.conversationStartTime) / 1000));

      if (conversationDurationSeconds >= graceSeconds && conversationConfidence >= 0.70) {
        isConfirmedConversation = true;
        reason = hasMultiplePeople
          ? `Conversation with second person confirmed (${conversationDurationSeconds}s)`
          : `External conversation confirmed (${conversationDurationSeconds}s)`;
      } else if (conversationDurationSeconds >= warningGraceSeconds) {
        isConversationWarning = true;
        reason = `Potential conversation in progress (${conversationDurationSeconds}s)`;
      }
    } else {
      if (conversationConfidence < 0.40) {
        this.conversationStartTime = null;
      }
    }

    return {
      conversationConfidence: Number(conversationConfidence.toFixed(2)),
      isPossibleConversation,
      isConversationWarning,
      isConfirmedConversation,
      conversationDurationSeconds,
      hasMultiplePeople,
      isReadingAloudOrSolo,
      reason
    };
  }

  reset(): void {
    this.history = [];
    this.conversationStartTime = null;
  }
}

export const conversationAnalyzer = new ConversationAnalyzer();
