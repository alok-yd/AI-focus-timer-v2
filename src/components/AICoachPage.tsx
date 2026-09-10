import React, { useState } from 'react';
import { AICoachAnalysis, DailySummary, FocusSession } from '../types';
import { AICoachService, LiveVoiceSession } from '../services/aiCoach';
import {
  Brain,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  Volume2,
  CheckCircle2
} from 'lucide-react';

interface AICoachPageProps {
  todaySummary: DailySummary;
  recentSessions: FocusSession[];
  examTarget: string;
}

export const AICoachPage: React.FC<AICoachPageProps> = ({
  todaySummary,
  recentSessions,
  examTarget
}) => {
  const [analysis, setAnalysis] = useState<AICoachAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Live Voice State (gemini-3.1-flash-live-preview)
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Voice coach ready to connect');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveVoiceSession | null>(null);

  // Fast low-latency chat state (gemini-3.1-flash-lite)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `Hello! I am your AI Focus Coach. I monitor your verified study metrics and can help you optimize mental stamina, prepare for ${examTarget || 'GATE'}, or plan your next study block. How can I help you right now?`
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Trigger Low-Latency Deep Retrospective Analysis
  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await AICoachService.requestAnalysis({
      todayStats: todaySummary,
      recentSessions: recentSessions.slice(0, 5),
      examTarget
    });

    if (result.success && result.data) {
      setAnalysis(result.data);
    }
    setIsAnalyzing(false);
  };

  // Toggle Live Voice (gemini-3.1-flash-live-preview)
  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      liveSession?.stop();
      setLiveSession(null);
      setIsVoiceActive(false);
      setIsSpeaking(false);
      setVoiceStatus('Voice session ended');
    } else {
      const session = new LiveVoiceSession(
        (status) => setVoiceStatus(status),
        (speaking) => setIsSpeaking(speaking)
      );
      setLiveSession(session);
      setIsVoiceActive(true);
      await session.start();
    }
  };

  // Fast Chat submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatLoading(true);

    const reply = await AICoachService.sendChatMessage(
      userText,
      chatMessages,
      {
        focusedMinutes: Math.round(todaySummary.focusedSeconds / 60),
        exam: examTarget
      }
    );

    setChatMessages(prev => [...prev, { role: 'model', text: reply }]);
    setIsChatLoading(false);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span>AI Focus & Performance Coach</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Powered by low-latency reasoning and live real-time voice feedback
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAnalyzing ? 'Analyzing Focus Data...' : 'Analyze Today\'s Focus'}</span>
          </button>
        </div>
      </div>

      {/* Hero: Real-time Live Voice Conversation Module (gemini-3.1-flash-live-preview) */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Voice API • gemini-3.1-flash-live-preview</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100">Live Voice Study Coach</h2>
            <p className="text-xs text-zinc-400 max-w-lg">
              Have an interactive spoken conversation with your AI coach. Ask questions about difficult concepts, discuss exam anxiety, or do a rapid verbal check-in during breaks.
            </p>
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2 pt-1">
              <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
              <span>{voiceStatus}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleToggleVoice}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                isVoiceActive
                  ? isSpeaking
                    ? 'bg-emerald-500 text-zinc-950 scale-110 ring-4 ring-emerald-500/40 animate-pulse'
                    : 'bg-indigo-600 text-white ring-4 ring-indigo-500/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              {isVoiceActive ? (
                isSpeaking ? <Volume2 className="w-7 h-7 animate-bounce" /> : <Mic className="w-7 h-7" />
              ) : (
                <MicOff className="w-7 h-7 text-zinc-400" />
              )}
            </button>
            <span className="text-[11px] font-semibold text-zinc-300">
              {isVoiceActive ? (isSpeaking ? 'AI Speaking...' : 'Listening to you...') : 'Start Spoken Session'}
            </span>
          </div>
        </div>
      </div>

      {/* Retrospective Report (gemini-3.1-flash-lite) */}
      {analysis && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Today's Verified Focus Retrospective</span>
              </h3>
              <p className="text-xs text-zinc-400">{analysis.summary}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              Low-Latency gemini-3.1-flash-lite
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Strengths */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Verified Strengths</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {analysis.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Distractions */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Distraction Patterns</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {analysis.distractionTriggers.map((dt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{dt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Best Window & Immediate Action */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div>
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Optimal Focus Window</span>
                </div>
                <div className="text-xs text-zinc-200 font-medium">{analysis.bestTimeBlock}</div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 mb-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Immediate Next Action</span>
                </div>
                <div className="text-xs text-zinc-200">{analysis.immediateAction}</div>
              </div>
            </div>
          </div>

          {/* Tomorrow's Recommendation */}
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-zinc-200">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-300 block mb-1">Tomorrow's Tactical Recommendation</strong>
              <p className="text-zinc-300">{analysis.tomorrowRecommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instant Low-Latency Text Chat with Coach (gemini-3.1-flash-lite) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Instant Study Advisor</h3>
          </div>
          <span className="text-[11px] text-zinc-500">Low-latency responses with gemini-3.1-flash-lite</span>
        </div>

        {/* Message Log */}
        <div className="h-64 overflow-y-auto space-y-3 pr-2">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-zinc-950 text-zinc-200 border border-zinc-800'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs rounded-2xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>Coach is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-zinc-800">
          <input
            type="text"
            placeholder="Ask your coach anything (e.g., 'How do I tackle 2 hours of Dynamic Programming without losing focus?')"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
