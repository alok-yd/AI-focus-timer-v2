import React from 'react';
import { FocusState } from '../types';
import { Play, Pause, Coffee, Settings, X, ExternalLink, CheckCircle2, AlertTriangle, Power } from 'lucide-react';
import { formatTimeHoursMins } from '../services/storage';

interface SystemTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusState: FocusState;
  focusScore: number;
  todayVerifiedSeconds: number;
  todayTargetHours: number;
  currentSubject: string;
  sessionFocusedSeconds: number;
  onStartResume: () => void;
  onPause: () => void;
  onStartBreak: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onQuit: () => void;
}

import { isFocusedState } from '../types';

export const SystemTrayModal: React.FC<SystemTrayModalProps> = ({
  isOpen,
  onClose,
  focusState,
  focusScore,
  todayVerifiedSeconds,
  todayTargetHours,
  currentSubject,
  sessionFocusedSeconds,
  onStartResume,
  onPause,
  onStartBreak,
  onOpenSettings,
  onOpenDashboard,
  onQuit
}) => {
  if (!isOpen) return null;

  const isRunning = isFocusedState(focusState) || focusState === 'WARNING' || focusState === 'UNCERTAIN';
  const targetSeconds = todayTargetHours * 3600;
  const progressPercent = Math.min(100, Math.round((todayVerifiedSeconds / targetSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-end p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-80 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden mt-8 text-zinc-200 animate-in fade-in slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tray Header */}
        <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-xs text-zinc-100 tracking-wide">Windows System Tray</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 space-y-3 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Current Focus</span>
            <span className={`font-semibold flex items-center gap-1 ${
              isFocusedState(focusState) ? 'text-emerald-400' :
              focusState === 'WARNING' || focusState === 'UNCERTAIN' ? 'text-amber-400' :
              focusState === 'BREAK' ? 'text-sky-400' : 'text-zinc-400'
            }`}>
              {isFocusedState(focusState) && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              {(focusState === 'WARNING' || focusState === 'UNCERTAIN') && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              {focusState === 'FOCUSED_PAPER' ? 'PAPER FOCUS' : focusState === 'FOCUSED_SCREEN' ? 'SCREEN FOCUS' : focusState === 'FOCUSED_MIXED' ? 'MIXED FOCUS' : focusState} (Score: {focusScore})
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Today's Verified Focus</span>
              <span className="text-zinc-200 font-medium">
                {formatTimeHoursMins(todayVerifiedSeconds)} / {todayTargetHours}h ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {currentSubject && (
            <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded border border-zinc-800/60">
              <span className="text-zinc-500">Active session:</span>{' '}
              <span className="text-zinc-200 font-medium">{currentSubject}</span>{' '}
              <span className="text-emerald-400">({formatTimeHoursMins(sessionFocusedSeconds)})</span>
            </div>
          )}
        </div>

        {/* Quick Tray Actions */}
        <div className="p-2 space-y-1 text-xs">
          <button
            onClick={() => {
              onOpenDashboard();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 transition-colors text-left"
          >
            <ExternalLink className="w-4 h-4 text-indigo-400" />
            <span>Open Dashboard</span>
          </button>

          {isRunning ? (
            <button
              onClick={() => {
                onPause();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-amber-300 transition-colors text-left"
            >
              <Pause className="w-4 h-4 text-amber-400" />
              <span>Pause Focus Verification</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onStartResume();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-emerald-300 transition-colors text-left"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>{focusState === 'PAUSED' ? 'Resume Session' : 'Start Focus Session'}</span>
            </button>
          )}

          <button
            onClick={() => {
              onStartBreak();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-sky-300 transition-colors text-left"
          >
            <Coffee className="w-4 h-4 text-sky-400" />
            <span>Start 5m Break</span>
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </button>

          <div className="h-px bg-zinc-800 my-1" />

          <button
            onClick={onQuit}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-950/40 text-rose-400 transition-colors text-left"
          >
            <Power className="w-4 h-4" />
            <span>Quit AI Focus Timer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
