import React, { useState, useEffect } from 'react';
import { Coffee, ArrowRight, Play, Sparkles } from 'lucide-react';
import { formatDigitalClock } from '../services/storage';

interface BreakModalProps {
  isOpen: boolean;
  onEndBreak: () => void;
}

const BREAK_OPTIONS = [
  { label: '5 min', seconds: 5 * 60 },
  { label: '10 min', seconds: 10 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '20 min', seconds: 20 * 60 }
];

export const BreakModal: React.FC<BreakModalProps> = ({ isOpen, onEndBreak }) => {
  const [selectedDuration, setSelectedDuration] = useState(5 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(5 * 60);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  useEffect(() => {
    if (!isOpen) return;
    setRemainingSeconds(selectedDuration);

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 4-4-4 Box breathing rhythm
    let phaseCount = 0;
    const breathTimer = setInterval(() => {
      phaseCount = (phaseCount + 1) % 3;
      if (phaseCount === 0) setBreathPhase('Inhale');
      else if (phaseCount === 1) setBreathPhase('Hold');
      else setBreathPhase('Exhale');
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(breathTimer);
    };
  }, [isOpen, selectedDuration]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/10 blur-3xl -z-10 rounded-full" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-6">
          <Coffee className="w-3.5 h-3.5" />
          <span>Intentional Recovery Break</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2">Rest Your Mind</h2>
        <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-8">
          Healthy breaks consolidate long-term memory and prevent cognitive depletion.
        </p>

        {/* Breathing Sphere */}
        <div className="relative w-44 h-44 mx-auto mb-8 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full border border-sky-500/30 bg-sky-500/5 transition-all duration-1000 ${
              breathPhase === 'Inhale' ? 'scale-110 bg-sky-500/15 shadow-lg shadow-sky-500/20' :
              breathPhase === 'Hold' ? 'scale-105 bg-sky-500/10' : 'scale-90 bg-sky-500/5'
            }`}
          />
          <div className="text-center z-10">
            <div className="font-mono text-3xl font-bold tracking-tight text-zinc-100 mb-1">
              {formatDigitalClock(remainingSeconds)}
            </div>
            <div className="text-xs font-medium text-sky-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{breathPhase}</span>
            </div>
          </div>
        </div>

        {/* Duration selector */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {BREAK_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setSelectedDuration(opt.seconds);
                setRemainingSeconds(opt.seconds);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedDuration === opt.seconds
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Resume Button */}
        <button
          onClick={onEndBreak}
          className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <span>Return to Focus Session</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
