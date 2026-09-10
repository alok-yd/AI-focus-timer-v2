import { VisionData } from '../types';
import { calibrationEngine } from '../services/calibrationEngine';

export type VisionCallback = (data: VisionData) => void;
export type CameraFailureCallback = (reason: string) => void;

export class VisionEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private lastAnalysisTime: number = 0;
  private isRunning: boolean = false;
  private isSimulated: boolean = false;
  private callbacks: Set<VisionCallback> = new Set();
  private failureCallbacks: Set<CameraFailureCallback> = new Set();
  
  // Smoothing history
  private yawHistory: number[] = [];
  private pitchHistory: number[] = [];
  private presenceHistory: boolean[] = [];

  // Desk & posture tracking
  private previousDeskLuminance: Uint8Array | null = null;
  private lastHandActivityTimestamp: number = Date.now();
  private centroidHistory: Array<{ x: number; y: number; t: number }> = [];

  // Health monitoring
  private consecutiveBlankFrames: number = 0;

  constructor() {
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = 160;
    this.canvasElement.height = 120;
    this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });
  }

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    } catch (e: any) {
      console.warn('Could not enumerate video devices:', e?.message || e);
      return [];
    }
  }

  async start(deviceId?: string, fps: number = 10): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning && !this.isSimulated) return { success: true };

    if (this.isSimulated) {
      this.stop();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Webcam API unavailable in this browser environment. Using smart focus simulation.');
        this.startSimulation(fps);
        return { success: false, error: 'Webcam not supported in this browser' };
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } }
          : { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Listen for stream track endings
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleCameraFailure('Camera stream ended or disconnected by operating system');
        };
      }

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('muted', '');
        this.videoElement.muted = true;
      }

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.isRunning = true;
      this.isSimulated = false;
      this.consecutiveBlankFrames = 0;
      this.loop(fps);

      return { success: true };
    } catch (err: any) {
      console.warn('VisionEngine webcam start unavailable, activating smart focus mode:', err?.name || err?.message || err);
      this.startSimulation(fps);
      return {
        success: false,
        error: err?.name === 'NotAllowedError' ? 'Permission denied' : (err?.message || 'Could not access webcam')
      };
    }
  }

  startSimulation(fps: number = 10): void {
    if (this.isRunning) {
      this.stop();
    }

    this.isRunning = true;
    this.isSimulated = true;
    const intervalMs = 1000 / fps;

    const frame = (now: number) => {
      if (!this.isRunning || !this.isSimulated) return;

      if (now - this.lastAnalysisTime >= intervalMs) {
        this.lastAnalysisTime = now;
        this.emitSimulatedFrame();
      }

      this.animationFrameId = requestAnimationFrame(frame);
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  private emitSimulatedFrame(): void {
    const t = Date.now() / 1000;
    // Micro-variations representing realistic paper or screen study
    const rawYaw = Math.round(Math.sin(t * 0.4) * 4);
    const rawPitch = Math.round(Math.cos(t * 0.25) * 4 - 14); // naturally angled downwards towards desk
    const isWritingCycle = Math.sin(t * 0.3) > -0.2; // writing for ~30-40s with thinking pauses

    const payload: VisionData = {
      facePresent: true,
      confidence: 0.96,
      headYaw: rawYaw,
      headPitch: rawPitch,
      headRoll: 0,
      eyeOpen: true,
      gazeScore: 0.92,
      faceBox: {
        x: 20,
        y: 18,
        width: 60,
        height: 65
      },
      handActivity: isWritingCycle,
      bodyPostureStable: true,
      deskActivityScore: isWritingCycle ? 0.75 : 0.4,
      isLookingDown: rawPitch < -8,
      lightingLevel: 'normal',
      lightingScore: 0.65,
      faceCount: 1,
      cameraHealthy: true,
      timestamp: Date.now()
    };

    calibrationEngine.feedSample(payload);
    this.callbacks.forEach(cb => cb(payload));
  }

  isSimulating(): boolean {
    return this.isSimulated;
  }

  stop(): void {
    this.isRunning = false;
    this.isSimulated = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  attachPreview(videoTag: HTMLVideoElement): void {
    if (this.stream) {
      videoTag.srcObject = this.stream;
      videoTag.play().catch(() => {});
    }
  }

  detachPreview(videoTag: HTMLVideoElement): void {
    if (videoTag.srcObject) {
      videoTag.srcObject = null;
    }
  }

  subscribe(callback: VisionCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  subscribeFailure(callback: CameraFailureCallback): () => void {
    this.failureCallbacks.add(callback);
    return () => this.failureCallbacks.delete(callback);
  }

  private handleCameraFailure(reason: string): void {
    this.failureCallbacks.forEach(cb => cb(reason));
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  private loop(targetFps: number): void {
    const intervalMs = 1000 / targetFps;

    const frame = (now: number) => {
      if (!this.isRunning) return;

      if (now - this.lastAnalysisTime >= intervalMs) {
        this.lastAnalysisTime = now;
        this.analyzeCurrentFrame();
      }

      this.animationFrameId = requestAnimationFrame(frame);
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  private analyzeCurrentFrame(): void {
    if (!this.videoElement || !this.canvasCtx || !this.canvasElement) return;
    if (this.videoElement.readyState < 2) return;

    const cw = this.canvasElement.width;
    const ch = this.canvasElement.height;

    this.canvasCtx.drawImage(this.videoElement, 0, 0, cw, ch);
    const imgData = this.canvasCtx.getImageData(0, 0, cw, ch);
    const data = imgData.data;

    const now = Date.now();
    const profile = calibrationEngine.getProfile();
    const deskYRatio = profile.isCalibrated ? profile.deskYRatio : 0.55;
    const deskStartY = Math.floor(ch * deskYRatio);

    // 1. Calculate lighting & luminance across sampled frame
    let totalLuma = 0;
    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = cw;
    let maxX = 0;
    let minY = ch;
    let maxY = 0;
    let skinInDeskRegion = 0;

    const totalSampled = (cw / 2) * (ch / 2);

    for (let y = 0; y < ch; y += 2) {
      const isDeskRow = y >= deskStartY;
      for (let x = 0; x < cw; x += 2) {
        const i = (y * cw + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;

        const isSkin =
          r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          (r - g) > 12 &&
          Math.abs(r - g) > 15 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15;

        if (isSkin) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          if (isDeskRow) {
            skinInDeskRegion++;
          }
        }
      }
    }

    const avgLuma = totalLuma / totalSampled;
    const lightingScore = Math.min(1.0, Math.max(0.0, avgLuma / 255));
    const lightingLevel: 'dark' | 'low' | 'normal' | 'bright' =
      avgLuma < 25 ? 'dark' : avgLuma < 65 ? 'low' : avgLuma > 220 ? 'bright' : 'normal';

    // Blank frame detection (e.g. camera lens covered or hardware stopped sending pixels)
    if (avgLuma < 4) {
      this.consecutiveBlankFrames++;
      if (this.consecutiveBlankFrames > 30) { // ~3 seconds at 10 FPS
        this.handleCameraFailure('Camera is blocked, covered, or producing blank black frames');
      }
    } else {
      this.consecutiveBlankFrames = 0;
    }

    const skinRatio = skinPixelCount / totalSampled;

    // Face presence threshold: minimum mass of skin in reasonable human proportions
    const rawFacePresent = skinRatio >= 0.04 && skinRatio <= 0.85 && (maxX - minX) > 18 && (maxY - minY) > 18;

    this.presenceHistory.push(rawFacePresent);
    if (this.presenceHistory.length > 5) this.presenceHistory.shift();
    const facePresent = this.presenceHistory.filter(Boolean).length >= 3;

    // Estimate multiple faces (e.g. bounding box span is unusually wide or high ratio)
    const boxSpanRatio = (maxX - minX) / cw;
    const faceCount = skinRatio > 0.45 && boxSpanRatio > 0.75 ? 2 : (facePresent ? 1 : 0);

    // 2. Desk Motion & Hand / Writing Activity Estimation
    const deskPixelCount = Math.floor((cw / 2) * ((ch - deskStartY) / 2));
    const currentDeskLuma = new Uint8Array(deskPixelCount);
    let deskLumaIdx = 0;
    let deskDiffSum = 0;

    for (let y = deskStartY; y < ch; y += 2) {
      for (let x = 0; x < cw; x += 2) {
        const i = (y * cw + x) * 4;
        const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        currentDeskLuma[deskLumaIdx] = luma;
        if (this.previousDeskLuminance && deskLumaIdx < this.previousDeskLuminance.length) {
          const diff = Math.abs(luma - this.previousDeskLuminance[deskLumaIdx]);
          if (diff > 12) {
            deskDiffSum += diff;
          }
        }
        deskLumaIdx++;
      }
    }
    this.previousDeskLuminance = currentDeskLuma;

    // Writing/hand movement threshold
    const deskMotionScore = Math.min(1.0, deskDiffSum / (deskPixelCount * 3));
    const deskSkinPresent = skinInDeskRegion > 8;
    const instantHandMotion = deskMotionScore > 0.07 || (deskSkinPresent && deskMotionScore > 0.03);

    if (instantHandMotion) {
      this.lastHandActivityTimestamp = now;
    }

    // Temporal smoothing: maintain hand/writing confidence for 45 seconds (allows quiet thinking pauses)
    const handActivity = (now - this.lastHandActivityTimestamp) < 45000;
    const deskActivityScore = instantHandMotion ? Math.max(0.65, deskMotionScore) : (handActivity ? 0.45 : 0.15);

    let headYaw = 0;
    let headPitch = 0;
    let eyeOpen = true;
    let gazeScore = 0.9;
    let confidence = 0.0;
    let faceBox: { x: number; y: number; width: number; height: number } | undefined;
    let isLookingDown = false;
    let bodyPostureStable = true;

    if (facePresent && skinPixelCount > 0) {
      const centerX = sumX / skinPixelCount;
      const centerY = sumY / skinPixelCount;

      // Track posture stability (variance of centroid over last 4 seconds)
      this.centroidHistory.push({ x: centerX, y: centerY, t: now });
      this.centroidHistory = this.centroidHistory.filter(c => now - c.t <= 4000);
      if (this.centroidHistory.length >= 4) {
        const meanX = this.centroidHistory.reduce((s, c) => s + c.x, 0) / this.centroidHistory.length;
        const meanY = this.centroidHistory.reduce((s, c) => s + c.y, 0) / this.centroidHistory.length;
        const variance = this.centroidHistory.reduce((s, c) => s + Math.hypot(c.x - meanX, c.y - meanY), 0) / this.centroidHistory.length;
        // Moderate variance is normal breathing/writing; severe variance (> 25px) indicates moving away/fidgeting
        bodyPostureStable = variance < 24;
      }

      // Frame center
      const frameCenterX = cw / 2;
      const frameCenterY = ch / 2;

      // Head Yaw: horizontal displacement of face centroid relative to center
      const normalizedOffsetX = (centerX - frameCenterX) / (cw / 2);
      const rawYaw = Math.round(normalizedOffsetX * 35);

      // Head Pitch: vertical displacement of face centroid
      // Negative = downward tilt towards desk / paper notes
      const normalizedOffsetY = (centerY - frameCenterY) / (ch / 2);
      const rawPitch = Math.round(normalizedOffsetY * -25);

      // Smooth yaw and pitch
      this.yawHistory.push(rawYaw);
      if (this.yawHistory.length > 4) this.yawHistory.shift();
      headYaw = Math.round(this.yawHistory.reduce((a, b) => a + b, 0) / this.yawHistory.length);

      this.pitchHistory.push(rawPitch);
      if (this.pitchHistory.length > 4) this.pitchHistory.shift();
      headPitch = Math.round(this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length);

      // Calibrated pitch thresholds
      const baselinePaperPitch = profile.isCalibrated ? profile.baselinePaperPitch : -18;
      const paperPitchThreshold = Math.min(-8, (baselinePaperPitch + 6));

      // Downward desk tilt check: pitch < paperPitchThreshold or face centroid in lower 55% of frame
      isLookingDown = headPitch <= paperPitchThreshold || centerY > (frameCenterY + 8);

      // Eye & Gaze estimation:
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const eyeRegionY = Math.floor(minY + boxH * 0.28);
      const eyeRegionH = Math.max(4, Math.floor(boxH * 0.22));

      // Analyze contrast in the eye band
      let eyeContrast = 0;
      let eyeSamples = 0;
      for (let ey = eyeRegionY; ey < Math.min(ch, eyeRegionY + eyeRegionH); ey++) {
        for (let ex = Math.floor(minX + boxW * 0.2); ex < Math.min(cw, Math.floor(maxX - boxW * 0.2)); ex += 2) {
          const idx = (ey * cw + ex) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          eyeContrast += Math.abs(lum - 128);
          eyeSamples++;
        }
      }

      const avgContrast = eyeSamples > 0 ? eyeContrast / eyeSamples : 50;
      eyeOpen = isLookingDown ? true : avgContrast > 14;

      // Soft Gaze score:
      const yawTolerance = profile.isCalibrated ? profile.tolerances.yawTolerance : 30;
      const yawPenalty = Math.min(1.0, Math.max(0, Math.abs(headYaw) - 10) / yawTolerance);
      const pitchPenalty = headPitch > 18 ? Math.min(1.0, (headPitch - 18) / 15) : 0;
      const combinedPenalty = yawPenalty * 0.75 + pitchPenalty * 0.25;
      
      gazeScore = Math.max(0.45, Number((1.0 - combinedPenalty * 0.45).toFixed(2)));
      confidence = Math.min(0.98, Number((0.68 + skinRatio * 0.6).toFixed(2)));

      faceBox = {
        x: Math.round((minX / cw) * 100),
        y: Math.round((minY / ch) * 100),
        width: Math.round((boxW / cw) * 100),
        height: Math.round((boxH / ch) * 100)
      };
    } else {
      confidence = 0.05;
      gazeScore = 0.0;
      eyeOpen = false;
      bodyPostureStable = false;
      isLookingDown = false;
    }

    const payload: VisionData = {
      facePresent,
      confidence,
      headYaw,
      headPitch,
      headRoll: 0,
      eyeOpen,
      gazeScore,
      faceBox,
      handActivity,
      bodyPostureStable,
      deskActivityScore,
      isLookingDown,
      lightingLevel,
      lightingScore,
      faceCount,
      cameraHealthy: true,
      timestamp: now
    };

    calibrationEngine.feedSample(payload);
    this.callbacks.forEach(cb => cb(payload));
  }
}

export const visionEngine = new VisionEngine();
