import React, { useState } from 'react';
import {
  Camera,
  Shield,
  Target,
  Sliders,
  Volume2,
  Calendar,
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2
} from 'lucide-react';
import { visionEngine } from '../vision/visionEngine';
import { soundFx } from '../services/audio';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (config: {
    targetHours: number;
    examGoal: string;
    sensitivity: 'Relaxed' | 'Balanced' | 'Strict';
  }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);
  const [cameraSuccess, setCameraSuccess] = useState<boolean | null>(null);
  const [targetHours, setTargetHours] = useState(12);
  const [examGoal, setExamGoal] = useState('GATE 2027 CSE');
  const [sensitivity, setSensitivity] = useState<'Relaxed' | 'Balanced' | 'Strict'>('Balanced');

  if (!isOpen) return null;

  const handleTestCamera = async () => {
    const res = await visionEngine.start();
    if (res.success) {
      setCameraSuccess(true);
      soundFx.playFocusRestored();
    } else {
      setCameraSuccess(false);
    }
  };

  const handleFinish = () => {
    onComplete({
      targetHours,
      examGoal,
      sensitivity
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-300">
              Welcome Setup • Step {step} of 6
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`w-4 h-1 rounded-full transition-all ${
                  s === step ? 'bg-indigo-500 w-6' : s < step ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Camera & Local Privacy */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">1. Camera Focus Verification</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              AI Focus Timer uses local computer vision to verify your study concentration in real-time. Frames are analyzed locally in browser memory and immediately discarded.
            </p>

            <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div className="text-xs">
                <div className="font-semibold text-zinc-200">Webcam Diagnostic</div>
                <div className="text-zinc-500 text-[11px]">
                  {cameraSuccess === true
                    ? 'Camera verified and active'
                    : cameraSuccess === false
                    ? 'Permission paused — Smart Focus mode will be used'
                    : 'Click to test local webcam'}
                </div>
              </div>
              <button
                onClick={handleTestCamera}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                {cameraSuccess === true ? 'Tested OK' : cameraSuccess === false ? 'Retry Camera' : 'Test Camera'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Privacy Policy */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">2. Local-Only Privacy Guarantee</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We never upload photos, raw video streams, or keystrokes to any cloud server. Everything stays on your computer.
            </p>
            <div className="space-y-2 text-xs text-zinc-300 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero cloud video processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Keystroke frequencies only (no typed words recorded)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Offline persistent storage in local database</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Exam Goal & Target */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">3. Set Your Study Goal</h2>
            <p className="text-xs text-zinc-400">
              Target daily verified hours and long-term exam objectives.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Target Exam / Core Pursuit</label>
                <input
                  type="text"
                  value={examGoal}
                  onChange={(e) => setExamGoal(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-300">
                  <span className="font-semibold">Daily Verified Study Target</span>
                  <span className="text-emerald-400 font-mono font-bold">{targetHours} Hours/Day</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={16}
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Focus Sensitivity */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sliders className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">4. Focus Sensitivity Profile</h2>
            <p className="text-xs text-zinc-400">
              Select how strictly the vision engine flags distractions:
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['Relaxed', 'Balanced', 'Strict'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSensitivity(p)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    sensitivity === p
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-semibold text-zinc-200 mb-1">{p}</div>
                  <div className="text-[10px] text-zinc-500">
                    {p === 'Relaxed' ? '6s Grace' : p === 'Balanced' ? '4s Grace' : '2s Grace'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Sound Effects */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Volume2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">5. Productivity Audio Feedback</h2>
            <p className="text-xs text-zinc-400">
              Soft harmonic chimes guide your focus transitions without startling you.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => soundFx.playFocusRestored()}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left hover:border-zinc-700"
              >
                <div className="font-semibold text-emerald-400">Focus Restored</div>
                <div className="text-[10px] text-zinc-500">Test Chime</div>
              </button>
              <button
                onClick={() => soundFx.playWarning()}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left hover:border-zinc-700"
              >
                <div className="font-semibold text-amber-400">Attention Warning</div>
                <div className="text-[10px] text-zinc-500">Test Chime</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Ready */}
        {step === 6 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Ready to Deep Focus</h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Targeting <strong>{targetHours} hours/day</strong> for <strong>{examGoal}</strong>. Start your first sprint now!
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800 mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Launch AI Focus Timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
