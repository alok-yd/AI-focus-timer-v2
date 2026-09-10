import React, { useState } from 'react';
import { UserSettings } from '../types';
import { calibrationEngine } from '../services/calibrationEngine';
import {
  Settings,
  Camera,
  Sliders,
  Shield,
  Activity,
  AppWindow,
  Trash2,
  CheckCircle2,
  Plus,
  X,
  Compass,
  Award,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SettingsPageProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetAllData: () => void;
  onOpenCalibration?: () => void;
  onOpenEvaluation?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
  onOpenCalibration,
  onOpenEvaluation
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'calibration' | 'sensitivity' | 'activity' | 'apps' | 'evaluation' | 'privacy'>('camera');
  const [newStudyApp, setNewStudyApp] = useState('');
  const [newDistractApp, setNewDistractApp] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  const currentCalibration = calibrationEngine.getProfile();

  const handleChange = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    onUpdateSettings(updated);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleApplyPreset = (preset: 'Relaxed' | 'Balanced' | 'Strict') => {
    if (preset === 'Relaxed') {
      handleChange({
        focusSensitivityPreset: 'Relaxed',
        focusThreshold: 60,
        warningThreshold: 40,
        distractionGracePeriodSeconds: 6,
        returnConfirmationSeconds: 2,
        awayThresholdSeconds: 15
      });
    } else if (preset === 'Balanced') {
      handleChange({
        focusSensitivityPreset: 'Balanced',
        focusThreshold: 70,
        warningThreshold: 50,
        distractionGracePeriodSeconds: 4,
        returnConfirmationSeconds: 3,
        awayThresholdSeconds: 10
      });
    } else {
      handleChange({
        focusSensitivityPreset: 'Strict',
        focusThreshold: 80,
        warningThreshold: 65,
        distractionGracePeriodSeconds: 2,
        returnConfirmationSeconds: 4,
        awayThresholdSeconds: 6
      });
    }
  };

  const handleAddStudyApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyApp.trim()) return;
    handleChange({
      studyApplications: [...settings.studyApplications, newStudyApp.trim()]
    });
    setNewStudyApp('');
  };

  const handleRemoveStudyApp = (app: string) => {
    handleChange({
      studyApplications: settings.studyApplications.filter(a => a !== app)
    });
  };

  const handleAddDistractApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistractApp.trim()) return;
    handleChange({
      distractingApplications: [...settings.distractingApplications, newDistractApp.trim()]
    });
    setNewDistractApp('');
  };

  const handleRemoveDistractApp = (app: string) => {
    handleChange({
      distractingApplications: settings.distractingApplications.filter(a => a !== app)
    });
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Application Settings & Calibration</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Customize local computer vision thresholds, activity detection, desk zones, and study rules
          </p>
        </div>

        {savedStatus && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('camera')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'camera' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Camera & Vision
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'calibration' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Desk Calibration</span>
        </button>
        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'sensitivity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Focus Sensitivity & Tolerances
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'activity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Activity Monitor
        </button>
        <button
          onClick={() => setActiveTab('apps')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'apps' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          App Rules & Context
        </button>
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'evaluation' ? 'border-sky-500 text-sky-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Model Benchmark</span>
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'privacy' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Privacy & Data
        </button>
      </div>

      {/* Camera Tab */}
      {activeTab === 'camera' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Webcam & Frame Processing</span>
          </h3>

          <div className="space-y-4 max-w-xl text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium">Processing Frame Rate (FPS)</label>
              <select
                value={settings.frameRateFps}
                onChange={(e) => handleChange({ frameRateFps: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
              >
                <option value={5}>5 FPS (Ultra-low CPU battery saver)</option>
                <option value={10}>10 FPS (Recommended - Highly responsive & &lt;2% CPU)</option>
                <option value={15}>15 FPS (High precision)</option>
                <option value={20}>20 FPS (Maximum smoothness)</option>
              </select>
              <p className="text-[11px] text-zinc-500">
                10 FPS gives real-time attention tracking while using less than 2% CPU.
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-zinc-800">
              <div>
                <span className="text-zinc-200 font-medium">Start Verification Automatically</span>
                <p className="text-[11px] text-zinc-500">Activate webcam monitor as soon as study session begins</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartCameraOnSession}
                onChange={(e) => handleChange({ autoStartCameraOnSession: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-zinc-950 border-zinc-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Calibration Tab */}
      {activeTab === 'calibration' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Personalized Study Desk Calibration</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Calibrates your normal head angles, paper reading tilt, desk boundary, and lighting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCalibration}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Calibration Wizard</span>
              </button>
              <button
                onClick={() => {
                  calibrationEngine.reset();
                  alert('Calibration parameters reset to default baseline.');
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Calibration State</span>
              <span className={currentCalibration.isCalibrated ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {currentCalibration.isCalibrated ? 'Custom Calibrated' : 'Factory Default'}
              </span>
              {currentCalibration.calibratedAt > 0 && (
                <span className="text-[10px] text-zinc-500 block">
                  Last: {new Date(currentCalibration.calibratedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Baseline Head Pitches</span>
              <span className="text-zinc-200 block">
                Screen: <strong className="text-indigo-400">{currentCalibration.baselineScreenPitch}°</strong> | Paper: <strong className="text-teal-400">{currentCalibration.baselinePaperPitch}°</strong>
              </span>
              <span className="text-[10px] text-zinc-500 block">
                Tolerance: ±{currentCalibration.tolerances.pitchTolerance}°
              </span>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Desk & Lighting Zone</span>
              <span className="text-zinc-200 block">
                Desk Y: <strong className="text-amber-400">{Math.round(currentCalibration.deskYRatio * 100)}%</strong> | Light: <strong className="text-zinc-300">{currentCalibration.lightingBaseline}/255</strong>
              </span>
              <span className="text-[10px] text-zinc-500 block">
                Sideways Yaw Max: ±{currentCalibration.tolerances.yawTolerance}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sensitivity Tab */}
      {activeTab === 'sensitivity' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Sensitivity Presets</span>
            </h3>
            <p className="text-xs text-zinc-400">Choose a calibrated profile or tune individual parameters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Relaxed', 'Balanced', 'Strict'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.focusSensitivityPreset === preset
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-100 mb-1">{preset}</div>
                <div className="text-[11px] text-zinc-400">
                  {preset === 'Relaxed' && 'Forgiving thresholds for long revision sessions and reading'}
                  {preset === 'Balanced' && 'Optimal setting for daily study and problem solving (4s grace)'}
                  {preset === 'Strict' && 'Aggressive thresholds for Mock Tests and exam simulations (2s grace)'}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Sliders */}
          <div className="space-y-4 pt-4 border-t border-zinc-800 max-w-xl text-xs">
            <h4 className="font-semibold text-zinc-200">Study Medium & Paper Tolerance</h4>

            {/* Default Study Medium */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium">Default Study Medium</label>
              <select
                value={settings.studyMedium || 'Screen Study'}
                onChange={(e) => handleChange({ studyMedium: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
              >
                <option value="Screen Study">Screen Study (Default for reading/coding on monitor)</option>
                <option value="Paper / PYQ Study">Paper / PYQ Study (High tolerance for solving on notebook)</option>
                <option value="Mixed Study">Mixed Study (Frequent switching between monitor and notebook)</option>
              </select>
              <p className="text-[11px] text-zinc-500">
                In Paper & Mixed modes, downward head tilt and looking at notes are recognized as valid focus.
              </p>
            </div>

            {/* Paper Mode Head-Down Tolerance */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Paper-Mode Head-Down Tolerance</span>
                <span className="font-mono text-zinc-200">{Math.round((settings.paperHeadDownToleranceSeconds || 300) / 60)} minutes ({settings.paperHeadDownToleranceSeconds || 300}s)</span>
              </div>
              <input
                type="range"
                min={60}
                max={900}
                step={30}
                value={settings.paperHeadDownToleranceSeconds || 300}
                onChange={(e) => handleChange({ paperHeadDownToleranceSeconds: Number(e.target.value) })}
                className="w-full"
              />
              <p className="text-[11px] text-zinc-500">
                Continuous head-down tolerance duration before requiring active desk motion verification.
              </p>
            </div>

            <h4 className="font-semibold text-zinc-200 pt-2 border-t border-zinc-800">Threshold Fine-Tuning</h4>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Focus Threshold Score</span>
                <span className="font-mono text-zinc-200">{settings.focusThreshold}</span>
              </div>
              <input
                type="range"
                min={50}
                max={90}
                value={settings.focusThreshold}
                onChange={(e) => handleChange({ focusThreshold: Number(e.target.value), focusSensitivityPreset: 'Custom' })}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Distraction Grace Period (Seconds)</span>
                <span className="font-mono text-zinc-200">{settings.distractionGracePeriodSeconds}s</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={settings.distractionGracePeriodSeconds}
                onChange={(e) => handleChange({ distractionGracePeriodSeconds: Number(e.target.value), focusSensitivityPreset: 'Custom' })}
                className="w-full"
              />
              <p className="text-[11px] text-zinc-500">
                Grace period before marking distraction (prevents pausing on water sips or scratchpad glances)
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Return Confirmation Duration (Seconds)</span>
                <span className="font-mono text-zinc-200">{settings.returnConfirmationSeconds}s</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={settings.returnConfirmationSeconds}
                onChange={(e) => handleChange({ returnConfirmationSeconds: Number(e.target.value), focusSensitivityPreset: 'Custom' })}
                className="w-full"
              />
              <p className="text-[11px] text-zinc-500">
                Seconds of unbroken attention required before auto-resuming timer
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Desk Absence / Away Threshold</span>
                <span className="font-mono text-zinc-200">{settings.awayThresholdSeconds}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={settings.awayThresholdSeconds}
                onChange={(e) => handleChange({ awayThresholdSeconds: Number(e.target.value), focusSensitivityPreset: 'Custom' })}
                className="w-full"
              />
              <p className="text-[11px] text-zinc-500">
                Seconds without face presence before pausing for user absence
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Monitor Tab */}
      {activeTab === 'activity' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Computer Activity Awareness</span>
          </h3>

          <div className="space-y-4 max-w-xl text-xs">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <div>
                <span className="text-zinc-200 font-medium">Keyboard Activity Frequency</span>
                <p className="text-[11px] text-zinc-500">Tracks event rate only, never keystroke content or text</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableKeyboardTracking}
                onChange={(e) => handleChange({ enableKeyboardTracking: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <div>
                <span className="text-zinc-200 font-medium">Mouse Activity Frequency</span>
                <p className="text-[11px] text-zinc-500">Detects deliberate interaction with notes and study problems</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableMouseTracking}
                onChange={(e) => handleChange({ enableMouseTracking: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-zinc-400">
                <span>Computer Idle Timeout (Seconds)</span>
                <span className="font-mono text-zinc-200">{settings.activityIdleTimeoutSeconds}s</span>
              </div>
              <input
                type="range"
                min={20}
                max={120}
                value={settings.activityIdleTimeoutSeconds}
                onChange={(e) => handleChange({ activityIdleTimeoutSeconds: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Apps Rules Tab */}
      {activeTab === 'apps' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-indigo-400" />
            <span>Study & Distraction App Context Rules</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Whitelisted Study Apps */}
            <div className="space-y-3">
              <span className="font-semibold text-emerald-400">Study Applications (Score Boost)</span>
              <form onSubmit={handleAddStudyApp} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Visual Studio Code, Anki, Obsidian"
                  value={newStudyApp}
                  onChange={(e) => setNewStudyApp(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100"
                />
                <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.studyApplications.map(app => (
                  <span key={app} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <span>{app}</span>
                    <button onClick={() => handleRemoveStudyApp(app)} className="hover:text-white cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Distraction Apps */}
            <div className="space-y-3">
              <span className="font-semibold text-rose-400">Distracting Applications (Triggers Warning)</span>
              <form onSubmit={handleAddDistractApp} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Netflix, Steam, Discord"
                  value={newDistractApp}
                  onChange={(e) => setNewDistractApp(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100"
                />
                <button type="submit" className="px-3 py-1.5 bg-rose-600 text-white rounded-lg cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.distractingApplications.map(app => (
                  <span key={app} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    <span>{app}</span>
                    <button onClick={() => handleRemoveDistractApp(app)} className="hover:text-white cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Tab */}
      {activeTab === 'evaluation' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-400" />
                <span>Accuracy & Reliability Benchmark Suite</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Runs local test cases across reading, writing, mathematical calculations, drinking water, and absences.
              </p>
            </div>

            <button
              onClick={onOpenEvaluation}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Launch Benchmark Workbench</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <h4 className="font-semibold text-zinc-100">Zero False-Pause Guarantee:</h4>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Our evaluation engine tests that the focus detector achieves a <strong>0.0% False-Pause Rate</strong> across normal study actions: notebook reading, pen-and-paper PYQ solving, thinking pauses with head down, gentle posture adjustments, and drinking water.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-emerald-200 mb-1">Local Privacy Assurance</strong>
              All computer vision (face, head orientation, gaze, eyes, desk) runs entirely inside client-side RAM on a local lightweight canvas. Video frames and keystrokes are never recorded, never stored on disk, and never transmitted to any cloud server.
            </div>
          </div>

          <div className="space-y-4 text-xs max-w-xl">
            <h4 className="font-semibold text-zinc-200">Data Management</h4>

            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div>
                <span className="text-zinc-200 font-medium">Clear All Focus Sessions & Analytics</span>
                <p className="text-[11px] text-zinc-500">Irreversibly wipe local study history</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to wipe all session history?')) {
                    onResetAllData();
                  }
                }}
                className="px-3 py-1.5 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
