import { ActivityData } from '../types';

export type ActivityCallback = (data: ActivityData) => void;

class ActivityMonitor {
  private lastKeyboardTimestamp: number = Date.now();
  private lastMouseTimestamp: number = Date.now();
  private lastInteractionTimestamp: number = Date.now();
  private isWindowFocused: boolean = true;
  private currentActiveApp: string = 'Visual Studio Code';
  private callbacks: Set<ActivityCallback> = new Set();
  private intervalId: number | null = null;
  private isTracking: boolean = false;

  start(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // Window focus/blur
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);

    // Keyboard activity: NEVER inspect or log event.key / characters! Strictly update timestamp.
    window.addEventListener('keydown', this.handleKeyDown, { passive: true });

    // Mouse activity: track movement / clicks
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('mousedown', this.handleMouseDown, { passive: true });

    // Periodic evaluation at 1 Hz
    this.intervalId = window.setInterval(() => {
      this.emitCurrentSnapshot();
    }, 1000);
  }

  stop(): void {
    this.isTracking = false;
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateSettings(_settings: any): void {
    // Dynamically adjust tracking sensitivity or app whitelist/blacklist
  }

  subscribe(callback: ActivityCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  setActiveApp(appName: string): void {
    this.currentActiveApp = appName;
    this.emitCurrentSnapshot();
  }

  getCurrentSnapshot(): ActivityData {
    const now = Date.now();
    const idleSeconds = Math.max(0, Math.floor((now - this.lastInteractionTimestamp) / 1000));
    const keyboardActive = (now - this.lastKeyboardTimestamp) < 3000;
    const mouseActive = (now - this.lastMouseTimestamp) < 3000;

    return {
      keyboardActive,
      mouseActive,
      idleSeconds,
      activeApp: this.currentActiveApp,
      isWindowFocused: this.isWindowFocused,
      lastActivityTimestamp: this.lastInteractionTimestamp
    };
  }

  private handleFocus = () => {
    this.isWindowFocused = true;
    this.emitCurrentSnapshot();
  };

  private handleBlur = () => {
    this.isWindowFocused = false;
    this.emitCurrentSnapshot();
  };

  private handleKeyDown = () => {
    // Privacy guarantee: No keystrokes recorded
    const now = Date.now();
    this.lastKeyboardTimestamp = now;
    this.lastInteractionTimestamp = now;
  };

  private handleMouseMove = () => {
    const now = Date.now();
    this.lastMouseTimestamp = now;
    this.lastInteractionTimestamp = now;
  };

  private handleMouseDown = () => {
    const now = Date.now();
    this.lastMouseTimestamp = now;
    this.lastInteractionTimestamp = now;
  };

  private emitCurrentSnapshot(): void {
    const snapshot = this.getCurrentSnapshot();
    this.callbacks.forEach(cb => cb(snapshot));
  }
}

export const activityMonitor = new ActivityMonitor();
