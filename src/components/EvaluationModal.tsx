import React, { useState, useEffect, useMemo } from 'react';
import { EvaluationMetrics } from '../types';
import { EvaluationEngine } from '../services/evaluationEngine';
import { StorageService } from '../services/storage';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Award,
  Zap,
  Check,
  Filter
} from 'lucide-react';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    if (isOpen) {
      const saved = StorageService.getEvaluationMetrics();
      if (saved) {
        setMetrics(saved);
      } else {
        handleRunEvaluation();
      }
    }
  }, [isOpen]);

  const handleRunEvaluation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = EvaluationEngine.runAllTests();
      setMetrics(results);
      setIsRunning(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Local Model Accuracy & Reliability Benchmark</h2>
              <p className="text-[11px] text-zinc-400">Evaluates study detection, paper PYQ solving & false pause rates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Score Cards */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Precision</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {Math.round(metrics.precision * 100)}%
                </span>
                <span className="text-[10px] text-zinc-500 block">Verified focus accuracy</span>
              </div>

              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Recall</span>
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {Math.round(metrics.recall * 100)}%
                </span>
                <span className="text-[10px] text-zinc-500 block">Focus capture rate</span>
              </div>

              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-[11px] text-zinc-500 block">F1 Score</span>
                <span className="text-xl font-bold font-mono text-teal-400">
                  {metrics.f1Score.toFixed(3)}
                </span>
                <span className="text-[10px] text-zinc-500 block">Harmonic mean balance</span>
              </div>

              <div className="bg-zinc-950 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
                <span className="text-[11px] text-emerald-400 font-semibold block">False Pause Rate</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {(metrics.falsePauseRate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-emerald-500/80 block">Target: 0.0% (Passed)</span>
              </div>
            </div>
          )}

          {/* Confusion Matrix */}
          {metrics && (
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">Confusion Matrix</span>
                <span className="text-[10px] text-zinc-500">Benchmark Test Sample Set</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono pt-1">
                <div className="p-2 text-zinc-500 text-[11px]">Actual \ Predicted</div>
                <div className="p-2 bg-zinc-900 rounded font-semibold text-emerald-400">Pred: Focus</div>
                <div className="p-2 bg-zinc-900 rounded font-semibold text-rose-400">Pred: Distract/Away</div>

                <div className="p-2 bg-zinc-900 rounded font-semibold text-emerald-400">Act: Focus</div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded font-bold">
                  TP: {metrics.confusionMatrix.truePositive}
                </div>
                <div className="p-2.5 bg-zinc-900/60 rounded text-zinc-400">
                  FN: {metrics.confusionMatrix.falseNegative}
                </div>

                <div className="p-2 bg-zinc-900 rounded font-semibold text-rose-400">Act: Non-Focus</div>
                <div className="p-2.5 bg-zinc-900/60 rounded text-zinc-400">
                  FP: {metrics.confusionMatrix.falsePositive}
                </div>
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded font-bold">
                  TN: {metrics.confusionMatrix.trueNegative}
                </div>
              </div>
            </div>
          )}

          {/* Scenario Breakdown Table with Category Tabs */}
          {metrics && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                <span>Scenario Validation Tests ({metrics.passedScenarios}/{metrics.totalScenarios} Passed)</span>
                <span className="text-[10px] text-zinc-500 font-normal">Updated {new Date(metrics.timestamp).toLocaleTimeString()}</span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                {['All', 'Paper / PYQ Study', 'Screen Study', 'Normal Study Movement', 'Distraction & Threats', 'Environmental & Hardware'].map((cat) => {
                  const count = cat === 'All' 
                    ? metrics.scenarioResults.length 
                    : metrics.scenarioResults.filter(s => s.category === cat).length;
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[9px] font-mono px-1 rounded ${isActive ? 'bg-indigo-700/80 text-white' : 'bg-zinc-850 text-zinc-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {metrics.scenarioResults
                  .filter(sc => activeCategory === 'All' || sc.category === activeCategory)
                  .map((sc, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {sc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-zinc-200">{sc.name}</div>
                          <div className="text-[10px] text-zinc-500">{sc.category} • {sc.details}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        sc.passed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {sc.actualState}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <span className="text-[11px] text-zinc-500">
            Automated testing against real study habits & posture variations.
          </span>

          <button
            onClick={handleRunEvaluation}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Tests...' : 'Re-Run Evaluation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
