import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Dashboard } from './components/Dashboard';
import { AnalyticsPage } from './components/AnalyticsPage';
import { AICoachPage } from './components/AICoachPage';
import { GoogleCalendarSync } from './components/GoogleCalendarSync';
import { SettingsPage } from './components/SettingsPage';
import { SessionSetupModal } from './components/SessionSetupModal';
import { BreakModal } from './components/BreakModal';
import { SystemTrayModal } from './components/SystemTrayModal';
import { OnboardingModal } from './components/OnboardingModal';
import { CalibrationModal } from './components/CalibrationModal';
import { EvaluationModal } from './components/EvaluationModal';
import { CameraFailureModal } from './components/CameraFailureModal';

import {
  FocusMode,
  FocusSession,
  FocusTimelineEvent,
  SubjectItem,
  UserSettings,
  DailySummary,
  StudyMedium
} from './types';
import { DEFAULT_SETTINGS, GATE_SUBJECTS } from './constants';
import { StorageService } from './services/storage';
import { focusEngine, FocusEngineOutput } from './services/focusEngine';
import { TimerEngine, TimerTickData } from './services/timerEngine';
import { activityMonitor } from './services/activityMonitor';
import { visionEngine } from './vision/visionEngine';
import {
  LayoutDashboard,
  BarChart3,
  Brain,
  Calendar,
  Settings,
  Shield
} from 'lucide-react';

export default function App() {
  // Initialize timer engine instance once
  const timerEngineRef = useRef<TimerEngine | null>(null);
  if (!timerEngineRef.current) {
    timerEngineRef.current = new TimerEngine(focusEngine);
  }
  const timerEngine = timerEngineRef.current;

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'coach' | 'calendar' | 'settings'>('dashboard');

  // Modals
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showTrayModal, setShowTrayModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showCameraFailureModal, setShowCameraFailureModal] = useState(false);
  const [cameraFailureReason, setCameraFailureReason] = useState<string>('');

  // Application Persistent State
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => StorageService.getSubjects());
  const [sessions, setSessions] = useState<FocusSession[]>(() => StorageService.getSessions());
  const [timelineEvents, setTimelineEvents] = useState<FocusTimelineEvent[]>(() => StorageService.getTimelineEvents());

  // Real-Time Focus Engine Output
  const [engineOutput, setEngineOutput] = useState<FocusEngineOutput>(() => focusEngine.getCurrentOutput());

  // Real-Time Timer Tick State
  const [tickData, setTickData] = useState<TimerTickData>({
    state: 'IDLE',
    elapsedSeconds: 0,
    focusedSeconds: 0,
    screenFocusedSeconds: 0,
    paperFocusedSeconds: 0,
    mixedFocusedSeconds: 0,
    uncertainSeconds: 0,
    unverifiedSeconds: 0,
    remainingTargetSeconds: 7200,
    distractedSeconds: 0,
    awaySeconds: 0,
    breakSeconds: 0,
    efficiency: 100,
    currentScore: 85,
    averageScore: 85,
    peakScore: 0,
    distractionCount: 0,
    targetSeconds: 7200,
    activeSubject: 'Algorithms',
    activeTopic: 'Dynamic Programming',
    activeGoal: 'Solve 5 PYQ problems',
    activeMode: 'Deep Focus',
    activeMedium: 'Screen Study',
    isCompleted: false
  });

  // Calculate Today's Summary
  const todaySummary: DailySummary = useMemo(() => {
    return StorageService.getTodaySummary(sessions, settings.dailyTargetHours * 3600);
  }, [sessions, settings.dailyTargetHours]);

  // Today's sessions subset
  const todaySessions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sessions.filter(s => new Date(s.startTime).toISOString().slice(0, 10) === todayStr);
  }, [sessions]);

  // Initialize Activity Monitor, Vision Listeners on Mount
  useEffect(() => {
    // Start activity monitor
    activityMonitor.start();

    // Pipe activity monitor snapshots into FocusEngine
    const unsubActivity = activityMonitor.subscribe((data) => {
      focusEngine.updateActivity(data);
    });

    // Pipe vision engine data into FocusEngine
    const unsubVision = visionEngine.subscribe((data) => {
      focusEngine.updateVision(data);
    });

    // Subscribe to camera failure events
    const unsubFailure = visionEngine.subscribeFailure((reason) => {
      setCameraFailureReason(reason);
      setShowCameraFailureModal(true);
    });

    // Check onboarding status
    if (!StorageService.hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }

    // Subscribe to FocusEngine
    const unsubFocus = focusEngine.subscribe((out) => {
      setEngineOutput(out);
    });

    // Subscribe to TimerEngine
    const unsubTimer = timerEngine.subscribe((tick) => {
      setTickData(tick);
    });

    return () => {
      activityMonitor.stop();
      unsubActivity();
      unsubVision();
      unsubFailure();
      unsubFocus();
      unsubTimer();
    };
  }, [timerEngine]);

  // Sync settings changes to FocusEngine & ActivityMonitor
  useEffect(() => {
    focusEngine.updateSettings(settings);
    activityMonitor.updateSettings(settings);
  }, [settings]);

  // Handle Session Start
  const handleStartSession = (
    subject: string,
    topic: string,
    targetSeconds: number,
    mode: FocusMode,
    goal: string,
    medium?: StudyMedium
  ) => {
    timerEngine.startSession(subject, topic, targetSeconds, mode, goal, medium);
    setActiveTab('dashboard');
  };

  // Handle Pause
  const handlePauseSession = () => {
    timerEngine.pauseSession();
  };

  // Handle Resume
  const handleResumeSession = () => {
    timerEngine.resumeSession();
  };

  // Handle Stop Session
  const handleStopSession = () => {
    const completed = timerEngine.stopSession();
    if (completed) {
      setSessions(StorageService.getSessions());
      setTimelineEvents(StorageService.getTimelineEvents());
    }
  };

  // Handle Break
  const handleStartBreak = () => {
    timerEngine.startBreak(5);
    setShowBreakModal(true);
  };

  const handleEndBreak = () => {
    setShowBreakModal(false);
    timerEngine.endBreak();
  };

  // Reset Timer
  const handleResetTimer = () => {
    if (confirm('Reset the current timer session?')) {
      timerEngine.stopSession();
    }
  };

  // Add Custom Subject
  const handleAddSubject = (name: string, category: string): SubjectItem => {
    const newSub: SubjectItem = {
      id: 'sub_' + Date.now(),
      name,
      category,
      isGateSubject: false
    };
    StorageService.saveSubject(newSub);
    setSubjects(StorageService.getSubjects());
    return newSub;
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  // Reset All Data
  const handleResetAllData = () => {
    StorageService.clearAll();
    setSessions([]);
    setTimelineEvents([]);
    setSubjects(GATE_SUBJECTS);
    setSettings(DEFAULT_SETTINGS);
  };

  // Finish Onboarding
  const handleCompleteOnboarding = (cfg: {
    targetHours: number;
    examGoal: string;
    sensitivity: 'Relaxed' | 'Balanced' | 'Strict';
  }) => {
    const updated = {
      ...settings,
      dailyTargetHours: cfg.targetHours,
      focusSensitivityPreset: cfg.sensitivity
    };
    handleUpdateSettings(updated);
    StorageService.setOnboardingComplete();
    setShowOnboarding(false);
  };

  // Refresh lists
  const handleRefreshData = () => {
    setSessions(StorageService.getSessions());
    setTimelineEvents(StorageService.getTimelineEvents());
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Windows Desktop Title Bar */}
      <TitleBar
        focusState={tickData.state}
        focusScore={engineOutput.score}
        activeSubject={tickData.activeSubject}
        activeTopic={tickData.activeTopic}
        onOpenTray={() => setShowTrayModal(true)}
        onMinimize={() => setShowTrayModal(true)}
        onMaximize={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }}
        onClose={() => setShowTrayModal(true)}
      />

      {/* Main Desktop Workspace with Structural Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-16 lg:w-56 bg-zinc-950/90 border-r border-zinc-800/80 flex flex-col justify-between p-2 lg:p-3 shrink-0">
          <div className="space-y-1">
            {/* Nav item 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Dashboard</span>
            </button>

            {/* Nav item 2: Analytics & Timeline */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Analytics & Logs</span>
            </button>

            {/* Nav item 3: AI Coach */}
            <button
              onClick={() => setActiveTab('coach')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'coach'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Brain className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="hidden lg:flex items-center justify-between flex-1">
                <span>AI Coach</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">LIVE</span>
              </div>
            </button>

            {/* Nav item 4: Google Calendar */}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0 text-indigo-400" />
              <span className="hidden lg:inline">Calendar Sync</span>
            </button>

            {/* Nav item 5: Settings */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Settings</span>
            </button>
          </div>

          {/* Bottom Sidebar Status Badge */}
          <div className="hidden lg:block p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Signal Verified</span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Head-down paper solving recognized as genuine focus.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {activeTab === 'dashboard' && (
            <Dashboard
              tickData={tickData}
              engineOutput={engineOutput}
              todayTargetHours={settings.dailyTargetHours}
              todayVerifiedSeconds={todaySummary.focusedSeconds}
              todayDistractionSeconds={todaySummary.distractedSeconds}
              todaySessionCount={todaySummary.sessionCount}
              todayLongestSession={todaySummary.longestSessionSeconds}
              onOpenSetup={() => setShowSetupModal(true)}
              onPause={handlePauseSession}
              onResume={handleResumeSession}
              onStop={handleStopSession}
              onStartBreak={handleStartBreak}
              onResetTimer={handleResetTimer}
              onSelectMedium={(med) => timerEngine.setStudyMedium(med)}
              onOpenCalibration={() => setShowCalibrationModal(true)}
              onOpenEvaluation={() => setShowEvaluationModal(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage
              sessions={sessions}
              todaySummary={todaySummary}
              timelineEvents={timelineEvents}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'coach' && (
            <AICoachPage
              todaySummary={todaySummary}
              recentSessions={sessions}
              examTarget="GATE 2027 CSE"
            />
          )}

          {activeTab === 'calendar' && (
            <GoogleCalendarSync
              todaySessions={todaySessions}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetAllData={handleResetAllData}
              onOpenCalibration={() => setShowCalibrationModal(true)}
              onOpenEvaluation={() => setShowEvaluationModal(true)}
            />
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <SessionSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        subjects={subjects}
        onAddSubject={handleAddSubject}
        onStartSession={handleStartSession}
      />

      <BreakModal
        isOpen={showBreakModal}
        onEndBreak={handleEndBreak}
      />

      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        onComplete={() => setShowCalibrationModal(false)}
      />

      <EvaluationModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
      />

      <CameraFailureModal
        isOpen={showCameraFailureModal}
        reason={cameraFailureReason}
        onContinueUnverified={() => {
          setShowCameraFailureModal(false);
          timerEngine.continueWithoutVerification();
        }}
        onPauseSession={() => {
          setShowCameraFailureModal(false);
          timerEngine.pauseSession();
        }}
        onRetryCamera={() => {
          setShowCameraFailureModal(false);
          visionEngine.start();
        }}
      />

      <SystemTrayModal
        isOpen={showTrayModal}
        onClose={() => setShowTrayModal(false)}
        focusState={tickData.state}
        focusScore={engineOutput.score}
        todayVerifiedSeconds={todaySummary.focusedSeconds}
        todayTargetHours={settings.dailyTargetHours}
        currentSubject={tickData.activeSubject}
        sessionFocusedSeconds={tickData.focusedSeconds}
        onStartResume={() => {
          if (tickData.state === 'PAUSED') handleResumeSession();
          else setShowSetupModal(true);
        }}
        onPause={handlePauseSession}
        onStartBreak={handleStartBreak}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenDashboard={() => setActiveTab('dashboard')}
        onQuit={() => {
          if (confirm('Exit AI Focus Timer? Your study logs are safely saved.')) {
            setShowTrayModal(false);
          }
        }}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleCompleteOnboarding}
      />
    </div>
  );
}
