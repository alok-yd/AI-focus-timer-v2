import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

// Lazy init Gemini SDK
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// Low-latency coach analysis using gemini-3.1-flash-lite
app.post('/api/coach/analyze', async (req, res) => {
  try {
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured. Showing local rule-based analytics.'
      });
    }

    const { todayStats, recentSessions, userGoal, examTarget } = req.body;

    const prompt = `
Analyze the following student focus tracking data and provide concise, deeply actionable feedback.
Target Exam/Context: ${examTarget || 'Competitive Exam (GATE 2027)'}
User Goal: ${userGoal || 'Target 8-12 hours verified daily focus'}

Today's Verified Statistics:
- Target Focus: ${todayStats?.targetSeconds ? Math.round(todayStats.targetSeconds / 3600 * 10) / 10 : 8} hours
- Verified Focus Time: ${todayStats?.focusedSeconds ? Math.round(todayStats.focusedSeconds / 60) : 0} minutes
- Distraction Time: ${todayStats?.distractedSeconds ? Math.round(todayStats.distractedSeconds / 60) : 0} minutes
- Away Time: ${todayStats?.awaySeconds ? Math.round(todayStats.awaySeconds / 60) : 0} minutes
- Efficiency: ${todayStats?.efficiency ? Math.round(todayStats.efficiency) : 0}%
- Total Sessions: ${todayStats?.sessionCount || 0}
- Longest Session: ${todayStats?.longestSessionSeconds ? Math.round(todayStats.longestSessionSeconds / 60) : 0} minutes

Recent Sessions Breakdown:
${JSON.stringify(recentSessions || [], null, 2)}

Provide your response in structured JSON with:
{
  "summary": "1-2 sentence objective assessment",
  "strengths": ["string", "string"],
  "distractionTriggers": ["string", "string"],
  "bestTimeBlock": "e.g., Morning 09:00 - 11:30 AM",
  "immediateAction": "1 specific tactic to apply in the very next session",
  "tomorrowRecommendation": "Concrete schedule or duration adjustment for tomorrow",
  "burnoutWarning": boolean
}
Return ONLY valid JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite, objective AI Focus Coach for serious engineering and competitive exam students. Provide precise, actionable advice without toxic positivity or generic motivational cliches.',
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Coach analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze focus data' });
  }
});

// Low-latency quick conversational coach chat using gemini-3.1-flash-lite
app.post('/api/coach/chat', async (req, res) => {
  try {
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured. Please add your key in AI Studio settings.'
      });
    }

    const { message, history, currentFocusContext } = req.body;

    const chatContents = (history || []).map((h: { role: string; text: string }) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    chatContents.push({
      role: 'user',
      parts: [{
        text: `[Current Session Context: State=${currentFocusContext?.state || 'IDLE'}, Score=${currentFocusContext?.focusScore || 0}, Subject=${currentFocusContext?.subject || 'General'}, FocusTime=${currentFocusContext?.focusedMinutes || 0}m]\n\nStudent Query: ${message}`
      }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: chatContents,
      config: {
        systemInstruction: 'You are the AI Focus Coach for AI Focus Timer. Respond swiftly, concisely (2-4 sentences max), scientifically, and empathetically. Help the student sustain high mental clarity, beat procrastination, and solve study blockers.'
      }
    });

    res.json({ success: true, reply: response.text || '' });
  } catch (error: any) {
    console.error('Coach chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to answer' });
  }
});

const server = http.createServer(app);

// WebSocket Server for Gemini Live API (gemini-3.1-flash-live-preview)
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs) => {
  const ai = getAI();
  if (!ai) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY not set on server' }));
    clientWs.close();
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }
          }
        },
        systemInstruction: 'You are the live verbal AI Focus Coach in the AI Focus Timer Windows desktop app. Speak with a natural, crisp, encouraging tone. Help students stay accountable, plan their focus sprint, or overcome mental fatigue.'
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ turnComplete: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ closed: true }));
          }
        }
      }
    });

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        } else if (parsed.text) {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: parsed.text }]
              }
            ],
            turnComplete: true
          });
        }
      } catch (err) {
        console.error('Error parsing client live message:', err);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch {}
    });

    clientWs.send(JSON.stringify({ ready: true, model: 'gemini-3.1-flash-live-preview' }));
  } catch (err: any) {
    console.error('Gemini Live connect error:', err);
    clientWs.send(JSON.stringify({ error: err.message || 'Failed to connect Live API' }));
    clientWs.close();
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Focus Timer server running at http://0.0.0.0:${PORT}`);
  });
}

start().catch(console.error);
