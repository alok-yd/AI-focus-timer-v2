import React from 'react';
import { FocusState } from '../types';
import { Brain, Minus, Square, X, Bell, Shield, ChevronDown } from 'lucide-react';

interface TitleBarProps {
  focusState: FocusState;
  focusScore: number;
  activeSubject?: string;
  activeTopic?: string;
  onOpenTray: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  focusState,
  focusScore,
  activeSubject,
  activeTopic,
  onOpenTray,
  onMinimize,
  onMaximize,
  onClose
}) => {
  const getStateBadge = () => {
    switch (focusState) {
      case 'FOCUSED':
      case 'FOCUSED_SCREEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SCREEN FOCUS • {focusScore}
          </span>
        );
      case 'FOCUSED_PAPER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            PAPER FOCUS • {focusScore}
          </span>
        );
      case 'FOCUSED_MIXED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            MIXED FOCUS • {focusScore}
          </span>
        );
      case 'UNCERTAIN':
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            UNCERTAIN • {focusScore}
          </span>
        );
      case 'UNVERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700/40 text-zinc-300 border border-zinc-600/40">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            UNVERIFIED
          </span>
        );
      case 'PAUSED':
      case 'DISTRACTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            PAUSED
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700/40 text-zinc-400 border border-zinc-600/40">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            AWAY
          </span>
        );
      case 'BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            BREAK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            IDLE
          </span>
        );
    }
  };

  return (
    <header className="h-10 bg-zinc-950/95 border-b border-zinc-800/80 flex items-center justify-between px-3 select-none z-50 text-xs font-medium text-zinc-300">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-zinc-100 font-semibold tracking-wide">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-sm">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span>AI Focus Timer</span>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {getStateBadge()}

        {activeSubject && (
          <div className="hidden md:flex items-center gap-1.5 text-zinc-400 max-w-xs truncate">
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-200 font-medium truncate">{activeSubject}</span>
            {activeTopic && <span className="text-zinc-500 truncate">: {activeTopic}</span>}
          </div>
        )}
      </div>

      {/* Middle: Windows Drag Area / Local Privacy Assurance */}
      <div className="hidden lg:flex items-center gap-1.5 text-zinc-500 text-[11px]">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span>Local Vision Engine • Zero Cloud Video</span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenTray}
          title="Windows System Tray quick menu"
          className="flex items-center gap-1 px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors mr-1"
        >
          <Bell className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] hidden sm:inline">Tray</span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </button>

        <button
          onClick={onMinimize}
          title="Minimize"
          className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMaximize}
          title="Maximize"
          className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>

        <button
          onClick={onClose}
          title="Close (Minimizes to System Tray)"
          className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-rose-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
