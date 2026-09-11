import { TemporalObservation } from '../../types';

export class TemporalEngine {
  private rollingObservations: TemporalObservation[] = [];
  private smoothedScore: number = 85;

  // Timers and counters
  private distractionStartTime: number | null = null;
  private awayStartTime: number | null = null;
  private phoneStartTime: number | null = null;
  private conversationStartTime: number | null = null;
  private sleepStartTime: number | null = null;
  private returnFocusStartTime: number | null = null;

  recordObservation(obs: TemporalObservation, windowDurationMs: number = 10000): void {
    const now = obs.timestamp;
    this.rollingObservations.push(obs);

    // Filter to keep observations within rolling window
    this.rollingObservations = this.rollingObservations.filter(o => (now - o.timestamp) <= windowDurationMs);

    // Calculate recency-weighted smoothed focus score
    if (this.rollingObservations.length > 0) {
      let weightedSum = 0;
      let totalWeights = 0;
      const count = this.rollingObservations.length;

      this.rollingObservations.forEach((item, idx) => {
        // Linearly increasing weight: recent frames weighted heavier
        const weight = 1.0 + (idx / count) * 1.5;
        weightedSum += item.focusScore * weight;
        totalWeights += weight;
      });

      this.smoothedScore = Math.round(weightedSum / totalWeights);
    } else {
      this.smoothedScore = obs.focusScore;
    }
  }

  getSmoothedScore(): number {
    return this.smoothedScore;
  }

  getObservations(): TemporalObservation[] {
    return [...this.rollingObservations];
  }

  // Away timer management
  handleAwayTiming(isFacePresent: boolean, now: number, awayThresholdSeconds: number): {
    isConfirmedAway: boolean;
    isGraceActive: boolean;
    awaySecondsRemaining: number;
    awayDurationSeconds: number;
  } {
    if (!isFacePresent) {
      if (this.awayStartTime === null) {
        this.awayStartTime = now;
      }
      const duration = (now - this.awayStartTime) / 1000;
      const isConfirmedAway = duration >= awayThresholdSeconds;
      const awaySecondsRemaining = Math.max(0, Math.ceil(awayThresholdSeconds - duration));

      return {
        isConfirmedAway,
        isGraceActive: !isConfirmedAway,
        awaySecondsRemaining,
        awayDurationSeconds: Math.floor(duration)
      };
    } else {
      this.awayStartTime = null;
      return {
        isConfirmedAway: false,
        isGraceActive: false,
        awaySecondsRemaining: 0,
        awayDurationSeconds: 0
      };
    }
  }

  // Distraction grace management
  handleDistractionTiming(isDistractedScore: boolean, now: number, graceSeconds: number): {
    isConfirmedDistracted: boolean;
    isGraceActive: boolean;
    graceSecondsRemaining: number;
    durationSeconds: number;
  } {
    if (isDistractedScore) {
      if (this.distractionStartTime === null) {
        this.distractionStartTime = now;
      }
      const duration = (now - this.distractionStartTime) / 1000;
      const isConfirmedDistracted = duration >= graceSeconds;
      const graceSecondsRemaining = Math.max(0, Math.ceil(graceSeconds - duration));

      return {
        isConfirmedDistracted,
        isGraceActive: !isConfirmedDistracted,
        graceSecondsRemaining,
        durationSeconds: Math.floor(duration)
      };
    } else {
      this.distractionStartTime = null;
      return {
        isConfirmedDistracted: false,
        isGraceActive: false,
        graceSecondsRemaining: 0,
        durationSeconds: 0
      };
    }
  }

  // Return-to-focus confirmation window
  handleReturnConfirmation(isEligibleForFocus: boolean, now: number, requiredSeconds: number = 3.0): {
    isFocusConfirmed: boolean;
    returnSecondsRemaining: number;
  } {
    if (isEligibleForFocus) {
      if (this.returnFocusStartTime === null) {
        this.returnFocusStartTime = now;
      }
      const focusDuration = (now - this.returnFocusStartTime) / 1000;
      const isFocusConfirmed = focusDuration >= requiredSeconds;
      const returnSecondsRemaining = Math.max(0, Math.ceil(requiredSeconds - focusDuration));

      if (isFocusConfirmed) {
        this.returnFocusStartTime = null;
      }

      return {
        isFocusConfirmed,
        returnSecondsRemaining
      };
    } else {
      this.returnFocusStartTime = null;
      return {
        isFocusConfirmed: false,
        returnSecondsRemaining: 0
      };
    }
  }

  resetAllTimers(): void {
    this.distractionStartTime = null;
    this.awayStartTime = null;
    this.phoneStartTime = null;
    this.conversationStartTime = null;
    this.sleepStartTime = null;
    this.returnFocusStartTime = null;
    this.rollingObservations = [];
  }
}

export const temporalEngine = new TemporalEngine();
