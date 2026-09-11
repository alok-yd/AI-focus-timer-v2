import React, { useState, useEffect, useRef } from 'react';
import { CALIBRATION_STEPS, calibrationEngine } from '../services/calibrationEngine';
import { visionEngine } from '../vision/visionEngine';
import { VisionData } from '../types';
import {
  Sliders,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  X,
  Camera,
  Compass,
  Maximize,
  Sparkles
} from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stepIndex, setStepIndex] = useState(0); // 0 to 10 (for steps 1 to 11)
  const [visionLive, setVisionLive] = useState<VisionData | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [isDone, setIsDone] = useState(false);

  const currentStepInfo = CALIBRATION_STEPS[stepIndex];

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setIsDone(false);
      return;
    }

    calibrationEngine.startCalibration();
    calibrationEngine.setStep(1);
    setCountdown(CALIBRATION_STEPS[0].durationSeconds);

    if (videoRef.current) {
      visionEngine.attachPreview(videoRef.current);
    }

    const unsub = visionEngine.subscribe((v) => {
      setVisionLive(v);
    });

    return () => {
      unsub();
      if (videoRef.current) {
        visionEngine.detachPreview(videoRef.current);
      }
    };
  }, [isOpen]);

  // Step countdown timer
  useEffect(() => {
    if (!isOpen || isDone) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleNextStep();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, stepIndex, isDone]);

  const handleNextStep = () => {
    if (stepIndex < CALIBRATION_STEPS.length - 1) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      calibrationEngine.setStep(nextIdx + 1);
      setCountdown(CALIBRATION_STEPS[nextIdx].durationSeconds);
    } else {
      // Completed all 11 steps
      calibrationEngine.finalizeCalibration();
      setIsDone(true);
      onComplete?.();
    }
  };

  const handleQuickCalibrate = () => {
    if (visionLive) {
      calibrationEngine.autoCalibrateFromSample(visionLive);
      setIsDone(true);
      onComplete?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Study Desk & Camera Calibration</h2>
              <p className="text-[11px] text-zinc-400">Learns your personalized study angles & paper position</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isDone ? (
          <div className="space-y-4">
            {/* Step Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-400">Step {stepIndex + 1} of {CALIBRATION_STEPS.length}</span>
                <span className="text-zinc-400 font-mono">{countdown}s remaining</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${((stepIndex + 1) / CALIBRATION_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Step Guidance Card */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  {currentStepInfo.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                  Step {currentStepInfo.step} of {CALIBRATION_STEPS.length}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {currentStepInfo.instructions}
              </p>
            </div>

            {/* Video Viewport with Live Telemetry Overlays */}
            <div className="relative aspect-16/9 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {visionLive && (
                <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between text-[10px] font-mono text-zinc-300 drop-shadow-md">
                  <div className="flex justify-between">
                    <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                      Pitch: <strong className={visionLive.headPitch < -8 ? 'text-teal-400' : 'text-zinc-100'}>{visionLive.headPitch}°</strong>
                    </span>
                    <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                      Yaw: <strong className="text-zinc-100">{visionLive.headYaw}°</strong>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                      Face: <strong className={visionLive.facePresent ? 'text-emerald-400' : 'text-rose-400'}>{visionLive.facePresent ? 'Detected' : 'Absent'}</strong>
                    </span>
                    <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                      Desk: <strong className={visionLive.handActivity ? 'text-emerald-400' : 'text-zinc-400'}>{visionLive.handActivity ? 'Writing' : 'Stable'}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleQuickCalibrate}
                className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick Calibrate Now</span>
              </button>

              <button
                onClick={handleNextStep}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{stepIndex === CALIBRATION_STEPS.length - 1 ? 'Finish' : 'Next Step'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-100">Study Desk Calibrated!</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Your custom screen and paper study postures have been saved. Head-down paper solving will now maintain continuous verified focus.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Done & Return to Timer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
