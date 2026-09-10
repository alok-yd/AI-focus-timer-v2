import React from 'react';
import { AlertTriangle, Play, Pause, CameraOff, ShieldAlert } from 'lucide-react';

interface CameraFailureModalProps {
  isOpen: boolean;
  reason?: string;
  onContinueUnverified: () => void;
  onPauseSession: () => void;
  onRetryCamera: () => void;
}

export const CameraFailureModal: React.FC<CameraFailureModalProps> = ({
  isOpen,
  reason,
  onContinueUnverified,
  onPauseSession,
  onRetryCamera
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <CameraOff className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-zinc-100">Focus Verification Unavailable</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {reason || 'Camera stream disconnected, blocked, or not generating valid video frames.'}
          </p>
        </div>

        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-[11px] text-zinc-400 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Integrity Rule</span>
          </div>
          <p>
            To keep your study records authentic, study time during camera downtime will be recorded as <strong>Unverified Time</strong> unless paused.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onContinueUnverified}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Continue Without Verification</span>
          </button>

          <button
            onClick={onPauseSession}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-700"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause Session</span>
          </button>

          <button
            onClick={onRetryCamera}
            className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Retry Camera Connection
          </button>
        </div>
      </div>
    </div>
  );
};
