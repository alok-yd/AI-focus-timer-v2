// Web Audio API synthesized chimes for pleasant, non-jarring productivity feedback

class AudioNotificationService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  playFocusRestored(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Two quick ascending chime tones: C5 (523.25) -> G5 (783.99)
    this.playTone(ctx, 523.25, now, 0.15, 'sine', 0.08);
    this.playTone(ctx, 783.99, now + 0.12, 0.25, 'sine', 0.08);
  }

  playWarning(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Single subtle mellow tone
    this.playTone(ctx, 392.00, now, 0.2, 'triangle', 0.06);
  }

  playAutoPaused(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Descending mellow tone: E4 (329.63) -> C4 (261.63)
    this.playTone(ctx, 329.63, now, 0.15, 'sine', 0.07);
    this.playTone(ctx, 261.63, now + 0.12, 0.25, 'sine', 0.07);
  }

  playTargetReached(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Triumphant arpeggio: C5 -> E5 -> G5 -> C6
    this.playTone(ctx, 523.25, now, 0.18, 'sine', 0.09);
    this.playTone(ctx, 659.25, now + 0.15, 0.18, 'sine', 0.09);
    this.playTone(ctx, 783.99, now + 0.30, 0.18, 'sine', 0.09);
    this.playTone(ctx, 1046.50, now + 0.45, 0.4, 'sine', 0.1);
  }

  playBreakEnd(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playTone(ctx, 440.00, now, 0.2, 'sine', 0.08);
    this.playTone(ctx, 554.37, now + 0.18, 0.25, 'sine', 0.08);
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    maxGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

export const soundFx = new AudioNotificationService();
