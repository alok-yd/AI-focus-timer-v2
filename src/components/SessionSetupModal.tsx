import React, { useState } from 'react';
import { FocusMode, StudyMedium, SubjectItem } from '../types';
import { X, Target, Clock, BookOpen, Sparkles, Plus, Check, Monitor, FileText } from 'lucide-react';

interface SessionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  onAddSubject: (name: string, category: string) => SubjectItem;
  onStartSession: (subject: string, topic: string, targetSeconds: number, mode: FocusMode, goal: string, medium: StudyMedium) => void;
}

const DURATION_PRESETS = [
  { label: '45m', seconds: 45 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '90m', seconds: 90 * 60 },
  { label: '2h', seconds: 120 * 60 },
  { label: '3h', seconds: 180 * 60 },
  { label: '4h', seconds: 240 * 60 }
];

const MODES: FocusMode[] = ['Deep Focus', 'Normal Study', 'Revision', 'PYQ Practice', 'Mock Test', 'Custom'];
const MEDIUMS: StudyMedium[] = ['Screen Study', 'Paper / PYQ Study', 'Mixed Study'];

export const SessionSetupModal: React.FC<SessionSetupModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onAddSubject,
  onStartSession
}) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || 'Algorithms');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [targetSeconds, setTargetSeconds] = useState(120 * 60); // 2 hours
  const [mode, setMode] = useState<FocusMode>('Deep Focus');
  const [medium, setMedium] = useState<StudyMedium>('Paper / PYQ Study');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  if (!isOpen) return null;

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const added = onAddSubject(newSubjectName.trim(), 'Custom');
    setSelectedSubject(added.name);
    setNewSubjectName('');
    setIsAddingSubject(false);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSession(
      selectedSubject,
      topic.trim() || 'General Problem Solving',
      targetSeconds,
      mode,
      goal.trim(),
      medium
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Setup Verified Focus Session</h2>
              <p className="text-xs text-zinc-400">Configure your target duration and study goals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleStart} className="p-6 space-y-5">
          {/* Subject selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Subject</span>
              </label>
              {!isAddingSubject ? (
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Subject</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-300"
                >
                  Cancel
                </button>
              )}
            </div>

            {isAddingSubject ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New subject name (e.g., Linear Algebra)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-indigo-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name} {sub.isGateSubject ? '(GATE)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Topic / Specific Focus</label>
            <input
              type="text"
              placeholder="e.g., Dynamic Programming, B-Trees, Normalization, Virtual Memory..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Target Duration Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target Study Time</span>
              </span>
              <span className="text-emerald-400 font-mono">
                {Math.floor(targetSeconds / 3600)}h {Math.floor((targetSeconds % 3600) / 60)}m
              </span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTargetSeconds(preset.seconds)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    targetSeconds === preset.seconds
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-xs'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Study Mode</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-left transition-all ${
                    mode === m
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{m}</span>
                    {mode === m && <Check className="w-3 h-3 text-indigo-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Study Medium (Screen vs Paper / PYQ vs Mixed) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Study Medium & Posture Mode</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono">Head-down safe</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIUMS.map((med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => setMedium(med)}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-left transition-all ${
                    medium === med
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-xs'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{med}</span>
                    {medium === med && <Check className="w-3 h-3 text-teal-400 shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              {medium === 'Paper / PYQ Study' && 'High tolerance for solving on notebook with pen & paper. Looking down will not pause timer.'}
              {medium === 'Screen Study' && 'Standard screen & IDE focus. Moderate head-down tolerance.'}
              {medium === 'Mixed Study' && 'Seamlessly alternate between notebook derivations and monitor.'}
            </p>
          </div>

          {/* Concrete Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Session Outcome / Concrete Goal</label>
            <input
              type="text"
              placeholder="e.g., Solve 5 Hard PYQs without checking solution hint"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Start Verified Focus Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
