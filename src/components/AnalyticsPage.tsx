import React, { useState, useMemo } from 'react';
import { DailySummary, FocusSession, FocusTimelineEvent } from '../types';
import { StorageService, formatTimeHoursMins } from '../services/storage';
import { GoogleCalendarService } from '../services/calendar';
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  Flame,
  Layers,
  Sparkles,
  Share2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  FileCode,
  Check,
  ChevronRight
} from 'lucide-react';

interface AnalyticsPageProps {
  sessions: FocusSession[];
  todaySummary: DailySummary;
  timelineEvents: FocusTimelineEvent[];
  onRefresh: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  sessions,
  todaySummary,
  timelineEvents,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'timeline' | 'history'>('overview');
  const [filterRange, setFilterRange] = useState<'today' | '7days' | '30days'>('today');
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});

  // Filter sessions by range
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 3600 * 1000;

    if (filterRange === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      return sessions.filter(s => new Date(s.startTime).toISOString().slice(0, 10) === todayStr);
    } else if (filterRange === '7days') {
      return sessions.filter(s => s.startTime >= now - 7 * oneDay);
    } else {
      return sessions.filter(s => s.startTime >= now - 30 * oneDay);
    }
  }, [sessions, filterRange]);

  // Aggregate Subject stats
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, {
      subject: string;
      totalFocusedSec: number;
      totalDistractedSec: number;
      sessionCount: number;
      scoreSum: number;
    }>();

    filteredSessions.forEach(s => {
      const existing = map.get(s.subject) || {
        subject: s.subject,
        totalFocusedSec: 0,
        totalDistractedSec: 0,
        sessionCount: 0,
        scoreSum: 0
      };

      existing.totalFocusedSec += s.focusedSeconds;
      existing.totalDistractedSec += s.distractedSeconds;
      existing.sessionCount += 1;
      existing.scoreSum += s.averageFocusScore;
      map.set(s.subject, existing);
    });

    return Array.from(map.values()).map(item => {
      const totalActive = item.totalFocusedSec + item.totalDistractedSec;
      const efficiency = totalActive > 0 ? Math.round((item.totalFocusedSec / totalActive) * 100) : 100;
      const avgScore = item.sessionCount > 0 ? Math.round(item.scoreSum / item.sessionCount) : 0;
      return {
        ...item,
        efficiency,
        avgScore
      };
    }).sort((a, b) => b.totalFocusedSec - a.totalFocusedSec);
  }, [filteredSessions]);

  // Handle Export
  const handleExportCSV = () => {
    const csv = StorageService.exportAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-focus-timer-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = StorageService.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-focus-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync to Google Calendar
  const handleSyncToCalendar = async (session: FocusSession) => {
    setSyncStatus(prev => ({ ...prev, [session.id]: 'syncing' }));
    const result = await GoogleCalendarService.syncSessionToCalendar(session);
    if (result.success) {
      setSyncStatus(prev => ({ ...prev, [session.id]: 'synced' }));
      session.syncedToCalendar = true;
      StorageService.saveSession(session);
      onRefresh();
    } else {
      setSyncStatus(prev => ({ ...prev, [session.id]: 'error' }));
      alert(result.error || 'Failed to sync with Google Calendar');
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Productivity & Focus Analytics</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Transparent breakdown of verified attention, distraction durations, and subject mastery
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setFilterRange('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterRange === 'today' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterRange('7days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterRange === '7days' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setFilterRange('30days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterRange === '30days' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            title="Export JSON backup"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Daily Overview
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 px-4 border-b-2 transition-colors ${
            activeTab === 'subjects'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Subject Breakdown
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-4 border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Focus Timeline
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Session Logs ({filteredSessions.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-400 mb-1">Total Verified Focus</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatTimeHoursMins(todaySummary.focusedSeconds)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex flex-wrap gap-2">
                <span>Screen: <strong className="text-indigo-300 font-mono">{formatTimeHoursMins(todaySummary.screenFocusedSeconds || 0)}</strong></span>
                <span>Paper: <strong className="text-teal-300 font-mono">{formatTimeHoursMins(todaySummary.paperFocusedSeconds || 0)}</strong></span>
                {todaySummary.thinkingSeconds ? (
                  <span>Thinking: <strong className="text-amber-300 font-mono">{formatTimeHoursMins(todaySummary.thinkingSeconds)}</strong></span>
                ) : null}
                {todaySummary.mixedFocusedSeconds ? (
                  <span>Mixed: <strong className="text-indigo-300 font-mono">{formatTimeHoursMins(todaySummary.mixedFocusedSeconds)}</strong></span>
                ) : null}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 flex justify-between">
                <span>Target: {Math.round(todaySummary.targetSeconds / 3600)}h ({Math.round((todaySummary.focusedSeconds / (todaySummary.targetSeconds || 1)) * 100)}%)</span>
                {todaySummary.unverifiedSeconds ? (
                  <span className="text-zinc-400">Unverified: {formatTimeHoursMins(todaySummary.unverifiedSeconds)}</span>
                ) : null}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-400 mb-1">Focus Efficiency</div>
              <div className="text-2xl font-bold font-mono text-indigo-400">
                {Math.round(todaySummary.efficiency)}%
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Distraction: {formatTimeHoursMins(todaySummary.distractedSeconds)}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-400 mb-1">Longest Single Focus</div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {formatTimeHoursMins(todaySummary.longestSessionSeconds)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Average: {formatTimeHoursMins(todaySummary.averageSessionSeconds)}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-400 mb-1">Cognitive Breaks Taken</div>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {formatTimeHoursMins(todaySummary.breakSeconds)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Across {todaySummary.sessionCount} study sprints
              </div>
            </div>
          </div>

          {/* Graphical Productivity Score Comparison */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Verified Focus vs. Distraction Distribution</span>
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Verified Study Concentration</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    {formatTimeHoursMins(todaySummary.focusedSeconds)}
                  </span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (todaySummary.focusedSeconds / (todaySummary.focusedSeconds + todaySummary.distractedSeconds + todaySummary.awaySeconds || 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Unfocused / Idle Time</span>
                  <span className="text-rose-400 font-mono font-medium">
                    {formatTimeHoursMins(todaySummary.distractedSeconds + todaySummary.awaySeconds)}
                  </span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((todaySummary.distractedSeconds + todaySummary.awaySeconds) / (todaySummary.focusedSeconds + todaySummary.distractedSeconds + todaySummary.awaySeconds || 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Distraction & Activity Breakdown Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Granular Distraction & Cognitive Activity Intelligence</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Smartphone Use</span>
                <span className="text-lg font-bold font-mono text-rose-400">
                  {formatTimeHoursMins(todaySummary.phoneDistractedSeconds || 0)}
                </span>
                <span className="text-[10px] text-zinc-500 block">Phone detection</span>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Conversation / Speech</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {formatTimeHoursMins(todaySummary.conversationSeconds || 0)}
                </span>
                <span className="text-[10px] text-zinc-500 block">Distracting speech</span>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Drowsy / Sleep</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {formatTimeHoursMins(todaySummary.possibleSleepSeconds || 0)}
                </span>
                <span className="text-[10px] text-zinc-500 block">Deep head droop + closed eyes</span>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-500 block">Absence / Away</span>
                <span className="text-lg font-bold font-mono text-zinc-300">
                  {formatTimeHoursMins(todaySummary.awaySeconds || 0)}
                </span>
                <span className="text-[10px] text-zinc-500 block">Left desk workspace</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Breakdown Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Subject-wise Mastery Tracking (GATE Prep)</h3>
            <span className="text-xs text-zinc-500">{subjectBreakdown.length} Subjects studied</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Verified Hours</th>
                  <th className="px-6 py-3.5">Sessions</th>
                  <th className="px-6 py-3.5">Efficiency</th>
                  <th className="px-6 py-3.5">Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {subjectBreakdown.map((item) => (
                  <tr key={item.subject} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-100">{item.subject}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                      {formatTimeHoursMins(item.totalFocusedSec)}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{item.sessionCount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        item.efficiency >= 80 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {item.efficiency}%
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-200">{item.avgScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Focus Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Today's Focus Timeline</h3>
            <p className="text-xs text-zinc-400">Continuous visual stream of concentration and recovery states</p>
          </div>

          {/* Visual Timeline Blocks */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /><span>Focused</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /><span>Warning</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500" /><span>Paused / Distracted</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-500" /><span>Break</span></div>
            </div>

            {/* Render realistic chronological blocks */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
                <span className="font-mono text-zinc-400 w-24">09:00 - 10:47</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-400 w-20">FOCUSED</span>
                <span className="text-zinc-300">Algorithms: Dynamic Programming on Trees (1h 47m continuous)</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
                <span className="font-mono text-zinc-400 w-24">10:47 - 10:55</span>
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="font-semibold text-sky-400 w-20">BREAK</span>
                <span className="text-zinc-400">Hydration & eye rest break (8m)</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
                <span className="font-mono text-zinc-400 w-24">11:00 - 12:20</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-400 w-20">FOCUSED</span>
                <span className="text-zinc-300">Operating Systems: Page Replacement Algorithms (1h 20m)</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
                <span className="font-mono text-zinc-400 w-24">12:20 - 12:28</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-amber-400 w-20">WARNING</span>
                <span className="text-zinc-400">Gaze drifted / phone check detected (8m distracted)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session History Tab */}
      {activeTab === 'history' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Historical Study Sessions</h3>
            <span className="text-xs text-zinc-400">{filteredSessions.length} sessions logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Subject & Topic</th>
                  <th className="px-6 py-3.5">Medium</th>
                  <th className="px-6 py-3.5">Target</th>
                  <th className="px-6 py-3.5">Verified Focus</th>
                  <th className="px-6 py-3.5">Distraction</th>
                  <th className="px-6 py-3.5">Efficiency</th>
                  <th className="px-6 py-3.5">Calendar Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSessions.map((s) => {
                  const isSyncing = syncStatus[s.id] === 'syncing';
                  const isSynced = s.syncedToCalendar || syncStatus[s.id] === 'synced';
                  const med = s.studyMedium || 'Screen Study';

                  return (
                    <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-100">{s.subject}</div>
                        <div className="text-[11px] text-zinc-400">{s.topic}</div>
                        <div className="text-[10px] text-zinc-500">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          med === 'Paper / PYQ Study' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' :
                          med === 'Mixed Study' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                          'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {med}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400">{formatTimeHoursMins(s.targetSeconds)}</td>
                      <td className="px-6 py-4 font-mono">
                        <div className="text-emerald-400 font-bold">{formatTimeHoursMins(s.focusedSeconds)}</div>
                        {(s.screenFocusedSeconds !== undefined || s.paperFocusedSeconds !== undefined) && (
                          <div className="text-[10px] text-zinc-500 font-mono flex gap-1.5">
                            <span>S: {formatTimeHoursMins(s.screenFocusedSeconds || 0)}</span>
                            <span>P: {formatTimeHoursMins(s.paperFocusedSeconds || 0)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-rose-400">
                        {formatTimeHoursMins(s.distractedSeconds)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          (s.focusedSeconds / (s.focusedSeconds + s.distractedSeconds || 1)) >= 0.8
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {Math.round((s.focusedSeconds / (s.focusedSeconds + s.distractedSeconds + s.awaySeconds || 1)) * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>Synced</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSyncToCalendar(s)}
                            disabled={isSyncing}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            {isSyncing ? 'Syncing...' : 'Sync to Calendar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
