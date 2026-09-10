import React, { useState, useEffect } from 'react';
import { GoogleCalendarEvent, FocusSession } from '../types';
import { GoogleCalendarService } from '../services/calendar';
import {
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  ExternalLink,
  BookOpen,
  CalendarDays
} from 'lucide-react';
import { formatTimeHoursMins } from '../services/storage';

interface GoogleCalendarSyncProps {
  todaySessions: FocusSession[];
  onRefresh: () => void;
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ todaySessions, onRefresh }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Schedule Study Block form state
  const [scheduleSubject, setScheduleSubject] = useState('Algorithms');
  const [scheduleTopic, setScheduleTopic] = useState('Graph Algorithms & Dijkstra');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [scheduleDurationMinutes, setScheduleDurationMinutes] = useState(120);

  // Check auth state on mount
  useEffect(() => {
    const unsub = GoogleCalendarService.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setCurrentUser(user);
        loadUpcomingEvents();
      } else {
        setIsSignedIn(false);
        setCurrentUser(null);
        setEvents([]);
      }
    });

    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    const result = await GoogleCalendarService.signInWithGoogle();
    setIsLoading(false);

    if (result.success) {
      setIsSignedIn(true);
      setCurrentUser(result.user);
      setStatusMsg({ type: 'success', text: `Connected Google Calendar as ${result.user?.email}` });
      await loadUpcomingEvents();
    } else {
      setStatusMsg({ type: 'error', text: result.error || 'Sign in failed' });
    }
  };

  const handleSignOut = async () => {
    await GoogleCalendarService.signOut();
    setIsSignedIn(false);
    setCurrentUser(null);
    setEvents([]);
    setStatusMsg({ type: 'info', text: 'Disconnected from Google Calendar' });
  };

  const loadUpcomingEvents = async () => {
    setIsLoading(true);
    const list = await GoogleCalendarService.fetchUpcomingEvents(10);
    setEvents(list);
    setIsLoading(false);
  };

  // Sync today's completed focus sessions
  const handleSyncAllToday = async () => {
    if (!isSignedIn) {
      setStatusMsg({ type: 'error', text: 'Please connect Google Calendar first' });
      return;
    }

    setIsLoading(true);
    let syncedCount = 0;

    for (const session of todaySessions) {
      if (!session.syncedToCalendar) {
        const res = await GoogleCalendarService.syncSessionToCalendar(session);
        if (res.success) {
          session.syncedToCalendar = true;
          syncedCount++;
        }
      }
    }

    setIsLoading(false);
    setStatusMsg({
      type: 'success',
      text: syncedCount > 0 ? `Successfully synced ${syncedCount} verified focus sessions to your Google Calendar!` : 'All sessions are already synced.'
    });
    await loadUpcomingEvents();
    onRefresh();
  };

  // Schedule a future block
  const handleScheduleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setStatusMsg({ type: 'error', text: 'Please sign in first' });
      return;
    }

    setIsLoading(true);
    const startDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + scheduleDurationMinutes * 60 * 1000);

    const result = await GoogleCalendarService.createStudyBlockEvent(
      scheduleSubject,
      scheduleTopic,
      startDateTime.toISOString(),
      endDateTime.toISOString(),
      'Deep Focus'
    );

    setIsLoading(false);
    if (result.success) {
      setStatusMsg({ type: 'success', text: `Scheduled ${scheduleSubject} block on Google Calendar!` });
      await loadUpcomingEvents();
    } else {
      setStatusMsg({ type: 'error', text: result.error || 'Failed to create calendar event' });
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Google Calendar Synchronization</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Automatically record verified study blocks and schedule deep focus sessions directly to your calendar
          </p>
        </div>

        <div>
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-zinc-200">{currentUser?.displayName || 'Google Account'}</div>
                <div className="text-[11px] text-zinc-500">{currentUser?.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>Connect Google Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          statusMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
          'bg-zinc-800 border-zinc-700 text-zinc-300'
        }`}>
          {statusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Sync Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Sync verified sessions & Schedule block */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick sync today's sessions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <span>Sync Today's Verified Focus</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Write completed focus sessions into Google Calendar with verified minute tallies
                </p>
              </div>

              <button
                onClick={handleSyncAllToday}
                disabled={!isSignedIn || isLoading || todaySessions.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync All ({todaySessions.length})</span>
              </button>
            </div>

            {/* List of today's sessions and sync status */}
            <div className="space-y-2 pt-2">
              {todaySessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No sessions recorded today yet. Start a focus session to record verified study hours.
                </div>
              ) : (
                todaySessions.map((s) => (
                  <div key={s.id} className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-zinc-200">{s.subject}: {s.topic}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Verified: <strong className="text-emerald-400">{formatTimeHoursMins(s.focusedSeconds)}</strong>
                      </div>
                    </div>
                    {s.syncedToCalendar ? (
                      <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">Unsynced</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Schedule Future Study Block Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Schedule Study Block on Google Calendar</span>
            </h3>

            <form onSubmit={handleScheduleBlock} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Subject</label>
                  <input
                    type="text"
                    value={scheduleSubject}
                    onChange={(e) => setScheduleSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Topic</label>
                  <input
                    type="text"
                    value={scheduleTopic}
                    onChange={(e) => setScheduleTopic(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Start Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Duration (Minutes)</label>
                  <select
                    value={scheduleDurationMinutes}
                    onChange={(e) => setScheduleDurationMinutes(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={90}>1.5 Hours</option>
                    <option value={120}>2 Hours</option>
                    <option value={180}>3 Hours</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isSignedIn || isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Create Event on Google Calendar
              </button>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Upcoming Scheduled Calendar Events */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Calendar Events</span>
            </h3>
            {isSignedIn && (
              <button
                onClick={loadUpcomingEvents}
                className="text-zinc-500 hover:text-zinc-300 p-1"
                title="Refresh calendar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {!isSignedIn ? (
              <div className="text-center py-10 space-y-3 text-zinc-500">
                <Calendar className="w-10 h-10 mx-auto text-zinc-700" />
                <p className="text-xs font-medium text-zinc-400">Google Calendar Not Connected</p>
                <p className="text-[11px] text-zinc-600 max-w-xs mx-auto">
                  Connect your Google account above to view your scheduled study sprints and upcoming exams.
                </p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">
                No upcoming events found on your Google Calendar.
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1 text-xs">
                  <div className="font-semibold text-zinc-100">{ev.summary}</div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>
                      {new Date(ev.start.dateTime || ev.start.date || '').toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {ev.description && (
                    <div className="text-[11px] text-zinc-500 line-clamp-2">{ev.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
