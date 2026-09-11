import { FocusEngineSettings, FocusState, StudyMedium } from '../../types';
import { ActivityRecognitionResult } from './ActivityRecognizer';
import { EvidenceFusionResult } from './EvidenceFusionEngine';
import { FaceAnalysisResult } from './analyzers/FaceAnalyzer';
import { PoseAnalysisResult } from './analyzers/PoseAnalyzer';
import { HandAnalysisResult } from './analyzers/HandAnalyzer';
import { PhoneAnalysisResult } from './analyzers/PhoneAnalyzer';
import { ConversationAnalysisResult } from './analyzers/ConversationAnalyzer';
import { SleepAnalysisResult } from './analyzers/SleepAnalyzer';
import { ComputerActivityAnalysisResult } from './analyzers/ComputerActivityAnalyzer';
import { ContextMemory } from './ContextMemory';
import { TemporalEngine } from './TemporalEngine';

export interface StateMachineEvaluation {
  nextState: FocusState;
  stateExplanation: string;
  distractionReason?: string;
  isGracePeriodActive: boolean;
  graceSecondsRemaining: number;
  returnConfirmationRemaining: number;
  hasStateChanged: boolean;
}

export class FocusStateMachine {
  evaluate(
    currentState: FocusState,
    activity: ActivityRecognitionResult,
    evidence: EvidenceFusionResult,
    face: FaceAnalysisResult,
    pose: PoseAnalysisResult,
    _hand: HandAnalysisResult,
    phone: PhoneAnalysisResult,
    conv: ConversationAnalysisResult,
    sleep: SleepAnalysisResult,
    _comp: ComputerActivityAnalysisResult,
    temporal: TemporalEngine,
    context: ContextMemory,
    settings: FocusEngineSettings,
    medium: StudyMedium,
    now: number = Date.now()
  ): StateMachineEvaluation {
    // 1. Inactive / Special States
    if (
      currentState === 'IDLE' ||
      currentState === 'BREAK' ||
      currentState === 'COMPLETED' ||
      currentState === 'UNVERIFIED'
    ) {
      return {
        nextState: currentState,
        stateExplanation: `Session is currently in ${currentState} state.`,
        isGracePeriodActive: false,
        graceSecondsRemaining: 0,
        returnConfirmationRemaining: 0,
        hasStateChanged: false
      };
    }

    const smoothedScore = temporal.getSmoothedScore();
    const {
      focusThreshold,
      warningThreshold,
      distractionGraceSeconds,
      returnConfirmationSeconds,
      awayThresholdSeconds
    } = settings;

    let nextState = currentState;
    let isGraceActive = false;
    let graceSecondsRemaining = 0;
    let returnSecondsRemaining = 0;
    let stateExplanation = evidence.primaryStudyEvidence;
    let distractionReason: string | undefined;

    // 2. Absence / AWAY Check
    const awayTiming = temporal.handleAwayTiming(face.facePresent, now, awayThresholdSeconds);
    if (!face.facePresent) {
      if (awayTiming.isConfirmedAway) {
        nextState = 'AWAY';
        distractionReason = `Absence confirmed: No subject detected at workstation for ${awayThresholdSeconds}s`;
        stateExplanation = 'Workstation unoccupied. Timer safely held.';
      } else {
        nextState = 'UNCERTAIN';
        isGraceActive = true;
        graceSecondsRemaining = awayTiming.awaySecondsRemaining;
        distractionReason = `Subject absent from camera (${graceSecondsRemaining}s grace)`;
        stateExplanation = 'Observing workstation occupancy grace period.';
      }

      return {
        nextState,
        stateExplanation,
        distractionReason,
        isGracePeriodActive: isGraceActive,
        graceSecondsRemaining,
        returnConfirmationRemaining: 0,
        hasStateChanged: nextState !== currentState
      };
    }

    // 3. Specific Threat Check: Smartphone Use
    if (phone.isPersistentPhoneUse) {
      nextState = 'PHONE_USE';
      distractionReason = phone.reason || 'Persistent smartphone distraction confirmed.';
      stateExplanation = 'Smartphone interaction active; study session paused.';
      return {
        nextState,
        stateExplanation,
        distractionReason,
        isGracePeriodActive: false,
        graceSecondsRemaining: 0,
        returnConfirmationRemaining: 0,
        hasStateChanged: nextState !== currentState
      };
    } else if (phone.isPhoneWarning) {
      nextState = 'WARNING';
      distractionReason = phone.reason;
      stateExplanation = 'Smartphone activity observed. Please return focus to study.';
    }

    // 4. Specific Threat Check: Conversation
    if (conv.isConfirmedConversation) {
      nextState = 'CONVERSATION';
      distractionReason = conv.reason || 'Conversation confirmed.';
      stateExplanation = 'Discussion with external individual detected; timer held.';
      return {
        nextState,
        stateExplanation,
        distractionReason,
        isGracePeriodActive: false,
        graceSecondsRemaining: 0,
        returnConfirmationRemaining: 0,
        hasStateChanged: nextState !== currentState
      };
    } else if (conv.isConversationWarning && nextState !== 'WARNING') {
      nextState = 'WARNING';
      distractionReason = conv.reason;
      stateExplanation = 'Discussion or second person observed in study area.';
    }

    // 5. Specific Threat Check: Sleep / Prolonged Rest
    if (sleep.isConfirmedSleepPause) {
      nextState = 'POSSIBLE_SLEEP';
      distractionReason = sleep.reason || 'Prolonged sleep or rest posture detected.';
      stateExplanation = 'Zero movement and closed eyes detected for extended period; timer paused.';
      return {
        nextState,
        stateExplanation,
        distractionReason,
        isGracePeriodActive: false,
        graceSecondsRemaining: 0,
        returnConfirmationRemaining: 0,
        hasStateChanged: nextState !== currentState
      };
    } else if (sleep.isPossibleSleepWarning && nextState !== 'WARNING') {
      nextState = 'WARNING';
      distractionReason = sleep.reason;
      stateExplanation = 'Prolonged stationary posture observed. Take a stretch or sip water.';
    }

    // 6. Normal Study Activity Assignment
    let targetFocusedState: FocusState = 'FOCUSED_SCREEN';

    if (activity.primaryActivity === 'THINKING') {
      // Thinking state counts 100% towards verified focus
      targetFocusedState = 'THINKING';
      stateExplanation = 'Quiet contemplation or mental calculation at study desk.';
    } else if (medium === 'Paper / PYQ Study') {
      targetFocusedState = 'FOCUSED_PAPER';
      stateExplanation = 'Notebook-oriented posture with verified desk presence.';
    } else if (medium === 'Mixed Study') {
      const isPaperOrientation = pose.isLookingDown || pose.isPitchCompatibleWithPaper || context.wasRecentlyInPaperFocus(60, now);
      targetFocusedState = isPaperOrientation ? 'FOCUSED_PAPER' : 'FOCUSED_SCREEN';
      stateExplanation = isPaperOrientation
        ? 'Notebook-oriented focus during mixed study session.'
        : 'Monitor-oriented focus during mixed study session.';
    } else {
      targetFocusedState = 'FOCUSED_SCREEN';
      stateExplanation = 'Direct screen study concentration detected.';
    }

    // 7. Focus Score State Transition Evaluation
    if (smoothedScore >= focusThreshold) {
      // Is resuming from a paused, distracted, away, or threat state?
      const wasInterrupted =
        currentState === 'PAUSED' ||
        currentState === 'AWAY' ||
        currentState === 'DISTRACTED' ||
        currentState === 'PHONE_USE' ||
        currentState === 'CONVERSATION' ||
        currentState === 'POSSIBLE_SLEEP';

      if (wasInterrupted) {
        const returnConfirm = temporal.handleReturnConfirmation(true, now, returnConfirmationSeconds);
        if (returnConfirm.isFocusConfirmed) {
          nextState = targetFocusedState;
          stateExplanation = 'Focus re-established and confirmed.';
        } else {
          returnSecondsRemaining = returnConfirm.returnSecondsRemaining;
          stateExplanation = `Confirming steady return to study posture (${returnSecondsRemaining}s)...`;
        }
      } else {
        // Continuous smooth transition between study states (e.g. FOCUSED_SCREEN <-> FOCUSED_PAPER <-> THINKING)
        temporal.handleReturnConfirmation(false, now);
        nextState = targetFocusedState;
      }
    } else if (smoothedScore >= warningThreshold) {
      temporal.handleReturnConfirmation(false, now);
      // Soft uncertainty buffer
      if (nextState !== 'WARNING') {
        nextState = 'UNCERTAIN';
        distractionReason = 'Mild evidence ambiguity (brief glance away, posture shift, or low lighting)';
        stateExplanation = 'Slight ambiguity in study signals; observing without pausing.';
      }
    } else {
      temporal.handleReturnConfirmation(false, now);
      // Low confidence (< warningThreshold) -> requires persistent distraction before pausing
      const distractionTiming = temporal.handleDistractionTiming(true, now, distractionGraceSeconds);
      if (distractionTiming.isConfirmedDistracted) {
        nextState = 'PAUSED';
        distractionReason = distractionReason || `Persistent non-study activity detected for ${distractionGraceSeconds}s`;
        stateExplanation = 'Verified focus paused due to persistent non-study behavior.';
      } else {
        nextState = 'DISTRACTED';
        isGraceActive = true;
        graceSecondsRemaining = distractionTiming.graceSecondsRemaining;
        distractionReason = distractionReason || `Non-study indicators observed (${graceSecondsRemaining}s grace remaining)`;
        stateExplanation = 'Distraction observed; waiting for return before pausing timer.';
      }
    }

    return {
      nextState,
      stateExplanation,
      distractionReason,
      isGracePeriodActive: isGraceActive,
      graceSecondsRemaining,
      returnConfirmationRemaining: returnSecondsRemaining,
      hasStateChanged: nextState !== currentState
    };
  }
}

export const focusStateMachine = new FocusStateMachine();
