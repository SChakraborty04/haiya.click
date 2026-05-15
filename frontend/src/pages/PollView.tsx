import { useParams } from 'react-router';
import { useRef, useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

function AnimatedAsciiBarChart({ panelRef }: { panelRef: React.RefObject<HTMLDivElement | null> }) {
  const NUM_BARS = 140;
  const [bars, setBars] = useState<number[]>(Array(NUM_BARS).fill(0));
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let phase = 0;
    const interval = setInterval(() => {
      phase += 0.1;
      setBars(Array.from({ length: NUM_BARS }, (_, i) => {
        const wave1 = Math.sin(phase + i * 0.08);
        const wave2 = Math.cos(phase * 0.6 + i * 0.05);
        const noise = Math.random() * 0.1;
        let val = (wave1 + wave2) * 0.5; 
        val = val * 0.5 + 0.5 + noise; 
        return Math.max(0, Math.min(1, val));
      }));
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const GRID_HEIGHT = 80;
  const WAVE_HEIGHT = 40;
  const renderChart = () => {
    let rect: DOMRect | null = null;
    if (containerRef.current) {
      rect = containerRef.current.getBoundingClientRect();
    }

    const mouseX = mousePosRef.current.x;
    const mouseY = mousePosRef.current.y;

    let isOverPanel = false;
    if (panelRef.current) {
      const pRect = panelRef.current.getBoundingClientRect();
      if (mouseX >= pRect.left && mouseX <= pRect.right && mouseY >= pRect.top && mouseY <= pRect.bottom) {
        isOverPanel = true;
      }
    }

    let output = [];
    for (let r = GRID_HEIGHT - 1; r >= 0; r--) {
      for (let c = 0; c < bars.length; c++) {
        let isHovered = false;
        if (rect) {
          const cellWidth = rect.width / bars.length;
          const cellHeight = rect.height / GRID_HEIGHT;
          const visualRow = (GRID_HEIGHT - 1) - r;
          const cellX = rect.left + c * cellWidth + cellWidth / 2;
          const cellY = rect.top + visualRow * cellHeight + cellHeight / 2;

          const dx = cellX - mouseX;
          const dy = cellY - mouseY;
          if (dx * dx + dy * dy < 400 && mouseY >= 75 && !isOverPanel) { // 20px radius, ignore header and panel
            isHovered = true;
          }
        }

        const threshold = r / WAVE_HEIGHT;
        if (isHovered) {
          output.push('<span style="color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.8);">*</span>');
        } else {
          if (bars[c] > threshold) {
            output.push('_');
          } else {
            output.push(' ');
          }
        }
      }
      output.push('\n');
    }
    return output.join('');
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <div 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: renderChart() }}
        style={{
          fontFamily: '"Space Mono", monospace',
          fontSize: '1.2vw',
          lineHeight: 0.8,
          color: 'rgba(220, 38, 38, 0.3)',
          whiteSpace: 'pre',
          textAlign: 'center',
        }}
      />
    </div>
  );
}

import { io, Socket } from 'socket.io-client';
import { backendUrl, authFetch, accessToken } from '../utils/auth';

export default function PollView() {
  const { slug } = useParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const [poll, setPoll] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [requiresAuthGate, setRequiresAuthGate] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authPassed, setAuthPassed] = useState(false); // flips to re-trigger initPoll
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIdRef = useRef<string>('');
  const [fingerprint] = useState(() => {
    let fp = localStorage.getItem('poll_fp');
    if (!fp) {
      fp = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('poll_fp', fp);
    }
    return fp;
  });

  // Inline login handler — no redirect
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoginError(json.message || 'Invalid credentials');
        return;
      }
      // Session is now set — clear gate and let initPoll re-run
      setRequiresAuthGate(false);
      setAuthPassed(p => !p); // toggle to re-trigger the useEffect
    } catch {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Polls /results until resultsReady, then stops
  const startResultsPoller = (pollId: string) => {
    if (resultsPollerRef.current) clearInterval(resultsPollerRef.current);
    setResultsLoading(true);
    const tryFetch = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/polls/${pollId}/results`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setQuestions(json.data.questions);
          if (json.data.poll.resultsReady) {
            setResultsLoading(false);
            if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
          }
        }
      } catch { /* ignore */ }
    };
    tryFetch();
    resultsPollerRef.current = setInterval(tryFetch, 2000);
  };

  useEffect(() => {
    let socket: Socket | null = null;

    const initPoll = async () => {
      try {
        const res = await authFetch(`${backendUrl}/api/polls/s/${slug}`);
        const json = await res.json();

        if (res.status === 403) {
          if (json.data?.status === 'No Permission') {
            setRequiresAuthGate(true);
          } else {
            setError(json.message || 'No Permission to access this poll');
          }
          setLoading(false);
          return;
        }

        // Additional safety check if backend didn't return 403 but status is No Permission
        if (json.data?.status === 'No Permission') {
          setRequiresAuthGate(true);
          setLoading(false);
          return;
        }

        if (json.success && json.data) {
          setPoll(json.data);
          pollIdRef.current = json.data._id;

          // Auth gate: if poll requires login, check if user has a valid session
          if (json.data.requireAuth) {
            try {
              const meRes = await authFetch(`${backendUrl}/api/auth/me`);
              if (!meRes.ok) { setRequiresAuthGate(true); setLoading(false); return; }
            } catch { setRequiresAuthGate(true); setLoading(false); return; }
          }

          if (json.data.isPublished) {
            // ── PUBLISHED: no socket, just poll /results from MongoDB ────────
            startResultsPoller(json.data._id);

          } else if (json.data.socket) {
            // ── WAITING for poll to start: join room, wait for QUESTION_PUBLISHED ──
            socket = io(backendUrl, { withCredentials: true, auth: { token: accessToken } });
            socket.on('connect', () => { socket?.emit('join-poll', { pollId: json.data._id }); });

            // Server rejected join because requireAuth is set and token is invalid
            socket.on('JOIN_REJECTED', (data: { reason: string; message: string }) => {
              if (data.reason === 'auth_required') {
                setRequiresAuthGate(true);
                setLoading(false);
                socket?.disconnect();
                socket = null;
              }
            });

            socket.on('QUESTION_PUBLISHED', async (data) => {
              if (data.pollId !== json.data._id) return;

              // 1. Update poll state so the UI transitions from waiting-room to live
              setPoll((prev: any) => ({
                ...prev,
                isStarted: true,
                isPublished: false,
                socket: false,
                expiryDate: data.expiryDate,
              }));

              // 2. Fetch questions with retries — the socket fires immediately after
              //    poll.save(), so the HTTP request can beat the DB write propagation.
              //    We retry up to 3 times with increasing backoff.
              const fetchQuestions = async (): Promise<any[]> => {
                try {
                  const qRes = await authFetch(`${backendUrl}/api/questions/${json.data._id}`);
                  if (qRes.status === 401) {
                    // requireAuth poll and the user is not logged in
                    setRequiresAuthGate(true);
                    socket?.disconnect();
                    socket = null;
                    return [];
                  }
                  const qJson = await qRes.json();
                  if (qJson.success && qJson.data?.length > 0) return qJson.data;
                } catch { /* ignore */ }
                return [];
              };

              const delays = [0, 400, 1000, 2000];
              let qs: any[] = [];
              for (const delay of delays) {
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
                qs = await fetchQuestions();
                if (qs.length > 0) break;
              }
              if (qs.length > 0) setQuestions(qs);

              // 3. Register VOTE_PULSE on the SAME socket so live tallying works
              //    without needing a page reload
              socket?.on('VOTE_PULSE', (vd: { qId: string; oId: string; newCount: number }) => {
                setTally(prev => ({ ...prev, [`q:${vd.qId}:opt:${vd.oId}`]: vd.newCount }));
              });
            });

            socket.on('POLL_PUBLISHED', (data: { pollId: string }) => {
              if (data.pollId === json.data._id) {
                setPoll((prev: any) => ({ ...prev, isPublished: true, socket: false }));
                startResultsPoller(data.pollId);
                socket?.disconnect();
                socket = null;
              }
            });

            socket.on('RESULTS_READY', (data: { pollId: string }) => {
              if (data.pollId === json.data._id) {
                setResultsLoading(false);
                if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
              }
            });

          } else {
            // ── LIVE (accepting votes): fetch questions + socket for VOTE_PULSE ──
            const qRes = await authFetch(`${backendUrl}/api/questions/${json.data._id}`);
            if (qRes.status === 401) { setRequiresAuthGate(true); setLoading(false); return; }
            const qJson = await qRes.json();
            if (qJson.success) setQuestions(qJson.data);

            socket = io(backendUrl, { withCredentials: true, auth: { token: accessToken } });
            socket.on('connect', () => { socket?.emit('join-poll', { pollId: json.data._id }); });

            // Server rejected join because requireAuth and token invalid
            socket.on('JOIN_REJECTED', (data: { reason: string }) => {
              if (data.reason === 'auth_required') { setRequiresAuthGate(true); }
            });

            socket.on('VOTE_PULSE', (data) => {
              setTally(prev => ({ ...prev, [`q:${data.qId}:opt:${data.oId}`]: data.newCount }));
            });

            socket.on('POLL_PUBLISHED', (data: { pollId: string }) => {
              if (data.pollId === json.data._id) {
                setPoll((prev: any) => ({ ...prev, isPublished: true }));
                startResultsPoller(data.pollId);
                socket?.disconnect();
                socket = null;
              }
            });

            socket.on('RESULTS_READY', (data: { pollId: string }) => {
              if (data.pollId === json.data._id) {
                setResultsLoading(false);
                if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
              }
            });
          }
        } else {
          setError(json.message || 'Poll not found');
        }
      } catch {
        setError('Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    initPoll();

    return () => {
      if (socket) socket.disconnect();
      if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [slug, authPassed]); // authPassed flip re-triggers initPoll after inline login

  // Countdown timer effect
  useEffect(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    if (poll?.isStarted && !poll?.isPublished && poll?.expiryDate) {
      const target = new Date(poll.expiryDate).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((target - now) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          // When time is up, the backend will auto-publish, and we'll get the POLL_PUBLISHED event.
          // In the meantime, we show a "Closing..." status.
        }
      };
      
      updateTimer();
      countdownIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [poll?.isStarted, poll?.isPublished, poll?.expiryDate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (poll?.isPublished || hasSubmitted || answers[questionId]) return;
    
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    
    // Submit this individual answer immediately
    // Use authFetch for requireAuth polls (logged-in user), plain fetch for anonymous polls
    const payload = [{ questionId, optionId }];
    try {
      const submitFn = authFetch;
      await submitFn(`${backendUrl}/api/polls/${poll._id}/submit`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ answers: payload, fingerprint })
      });
    } catch(e) {
      console.error("Failed to submit individual answer");
    }

    // Auto move to next question
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setHasSubmitted(true);
      }
    }, 600);
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setHasSubmitted(true);
    }
  };

  const s = { fontFamily: '"Space Mono", monospace' } as const;

  if (loading) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', ...s, paddingTop: '57px', boxSizing: 'border-box' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ animation: 'pulse 1.5s infinite', letterSpacing: '0.2em' }}>[ ESTABLISHING CONNECTION... ]</div>
        </div>
        <Footer />
        <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  // ─── AUTH GATE: inline login form ─────────────────────────────────────────────
  if (requiresAuthGate) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', ...s, paddingTop: '57px', boxSizing: 'border-box' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{
            border: '1px solid #27272a',
            padding: '48px 56px',
            maxWidth: 460,
            width: '100%',
            background: 'rgba(10,10,10,0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0,
            boxShadow: '0 0 60px rgba(220,38,38,0.1)',
          }}>
            {/* Icon + Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{
                width: 52, height: 52, border: '1px solid #dc2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#dc2626',
              }}>🔒</div>
              <div style={{ fontSize: 10, color: '#dc2626', letterSpacing: '0.25em' }}>[ AUTHENTICATION REQUIRED ]</div>
              <div style={{ fontSize: 20, color: '#f5f5f5', letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.3 }}>
                {poll?.title}
              </div>
              <div style={{ fontSize: 12, color: '#71717a', textAlign: 'center', lineHeight: 1.7 }}>
                This poll requires you to be signed in to participate.
              </div>
            </div>

            {/* Inline login form */}
            <form onSubmit={handleInlineLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.15em' }}>EMAIL</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{
                    background: '#18181b', border: '1px solid #3f3f46',
                    color: '#f5f5f5', padding: '12px 14px', fontSize: 13,
                    outline: 'none', width: '100%', boxSizing: 'border-box',
                    fontFamily: '"Space Mono", monospace',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3f3f46')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.15em' }}>PASSWORD</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    background: '#18181b', border: '1px solid #3f3f46',
                    color: '#f5f5f5', padding: '12px 14px', fontSize: 13,
                    outline: 'none', width: '100%', boxSizing: 'border-box',
                    fontFamily: '"Space Mono", monospace',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3f3f46')}
                />
              </div>

              {loginError && (
                <div style={{ fontSize: 12, color: '#ef4444', letterSpacing: '0.05em', textAlign: 'center', padding: '8px 0' }}>
                  ⚠ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  marginTop: 8,
                  padding: '14px 0',
                  background: loginLoading ? '#7f1d1d' : '#dc2626',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  letterSpacing: '0.15em',
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Space Mono", monospace',
                  transition: 'background 0.2s, opacity 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => { if (!loginLoading) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {loginLoading ? 'LOGGING IN...' : 'LOG IN & PARTICIPATE'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 20px' }}>
              <div style={{ flex: 1, height: 1, background: '#27272a' }} />
              <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#27272a' }} />
            </div>

            <a
              href={`/register?redirect=${encodeURIComponent(window.location.pathname)}`}
              style={{
                display: 'block', textAlign: 'center', fontSize: 12,
                color: '#a1a1aa', textDecoration: 'none', letterSpacing: '0.08em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
            >
              Don't have an account? <span style={{ color: '#dc2626' }}>Register →</span>
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isLive = !poll?.socket && !poll?.isPublished;
  const isPublished = poll?.isPublished;

  // Results view: reads opt.count from MongoDB (set by the batch worker)
  const ResultsView = () => {
    if (resultsLoading) {
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div style={{ ...s, fontSize: 11, color: '#eab308', letterSpacing: '0.15em', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
            ⏳ FINALIZING RESULTS — SYNCING TO DATABASE...
          </div>
          {questions.map((q: any) => (
            <div key={q._id} style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)', opacity: 0.6 }}>
              <div style={{ ...s, fontSize: 14, color: '#f5f5f5', marginBottom: 12 }}>{q.order}. {q.text}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt: any) => (
                  <div key={opt.id} style={{ position: 'relative', padding: '10px 14px', border: '1px solid #27272a', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite', zIndex: 0 }} />
                    <span style={{ ...s, fontSize: 13, color: '#a1a1aa', position: 'relative', zIndex: 1 }}>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
        <div style={{ ...s, fontSize: 11, color: '#22c55e', letterSpacing: '0.15em', textAlign: 'center' }}>
          ✓ FINAL RESULTS 
        </div>
        {questions.map((q: any) => {
          const totalVotes = q.options.reduce((sum: number, opt: any) => sum + (opt.count || 0), 0);
          const maxVotes = Math.max(...q.options.map((o: any) => o.count || 0));
          return (
            <div key={q._id} style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ ...s, fontSize: 15, color: '#f5f5f5', marginBottom: 4 }}>
                {q.order}. {q.text} {q.isRequired && <span style={{ color: '#dc2626' }}>*</span>}
              </div>
              <div style={{ ...s, fontSize: 11, color: '#a1a1aa', marginBottom: 14 }}>{totalVotes} total votes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map((opt: any) => {
                  const count = opt.count || 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isWinner = count === maxVotes && maxVotes > 0;
                  return (
                    <div key={opt.id} style={{ position: 'relative', padding: '10px 14px', border: `1px solid ${isWinner ? '#22c55e' : '#27272a'}`, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: isWinner ? 'rgba(34,197,94,0.2)' : 'rgba(220,38,38,0.15)', transition: 'width 0.7s ease', zIndex: 0 }} />
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ ...s, fontSize: 13, color: isWinner ? '#22c55e' : '#e4e4e7' }}>
                          {isWinner ? '▶ ' : ''}{opt.text}
                        </span>
                        <span style={{ ...s, fontSize: 12, color: '#a1a1aa', marginLeft: 16, whiteSpace: 'nowrap' }}>
                          {pct}% <span style={{ color: '#f5f5f5' }}>({count})</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: '57px', boxSizing: 'border-box' }}>
      <Header />
      <main style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px 16px' }}>
        <AnimatedAsciiBarChart panelRef={panelRef} />
        
        <div 
          ref={panelRef}
          style={{
            zIndex: 10,
            background: 'rgba(10, 10, 10, 0.88)',
            border: `1px solid ${isPublished ? '#22c55e44' : '#27272a'}`,
            padding: '32px 24px',
            minWidth: 'min(400px, 90vw)',
            maxWidth: '640px',
            width: '92vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            boxShadow: isPublished ? '0 0 40px rgba(34, 197, 94, 0.08)' : '0 0 40px rgba(220, 38, 38, 0.1)',
            transition: 'all 0.4s ease'
          }}
        >
          {error ? (
            <div style={{ color: '#dc2626', fontSize: 16, ...s, textAlign: 'center' }}>
              [ ERROR: {error.toUpperCase()} ]
            </div>
          ) : (
            <>
              {/* Status badge */}
              <div style={{ fontSize: 12, display: 'flex', gap: 16, color: isPublished ? '#22c55e' : isLive ? '#eab308' : '#a1a1aa', letterSpacing: '0.2em', ...s }}>
                <span>[ {isPublished ? '✓ RESULTS PUBLISHED' : isLive ? '● LIVE POLL' : 'WAITING FOR POLL TO START'} ]</span>
                {timeLeft !== null && (
                  <span style={{ color: timeLeft <= 10 ? '#ef4444' : '#eab308' }}>
                    {timeLeft > 0 ? `⌛ ${formatTime(timeLeft)} LEFT` : '⏳ CLOSING...'}
                  </span>
                )}
              </div>

              {/* Poll title */}
              <div style={{ fontSize: 28, color: '#f5f5f5', letterSpacing: '0.08em', ...s, textTransform: 'uppercase', textShadow: '0 0 20px rgba(220, 38, 38, 0.4)', textAlign: 'center' }}>
                {poll?.title}
              </div>

              {/* Creator info — only shown for non-anonymous polls */}
              {poll?.creatorId && !poll?.isAnonymous && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a1a1aa', flexShrink: 0 }}>
                    {(poll.creatorId.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 12, color: '#f5f5f5', ...s }}>{poll.creatorId.name || 'Anonymous'}</span>
                    <span style={{ fontSize: 10, color: '#71717a', ...s }}>{poll.creatorId.email}</span>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 9, color: '#52525b', letterSpacing: '0.1em' }}>CREATOR</div>
                </div>
              )}

              {/* Waiting state — poll not yet started */}
              {poll?.socket && questions.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 0' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '2px solid #27272a',
                    borderTopColor: '#dc2626',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div style={{ color: '#f5f5f5', fontSize: 13, ...s, letterSpacing: '0.15em' }}>
                    STARTING POLL...
                  </div>
                  <div style={{ color: '#71717a', fontSize: 11, ...s, letterSpacing: '0.1em', textAlign: 'center' }}>
                    Waiting for the creator to launch this poll.<br />You'll see the questions automatically.
                  </div>
                </div>
              )}

              {/* ── PUBLISHED: show all results ── */}
              {isPublished && questions.length > 0 && <ResultsView />}

              {/* ── LIVE voting: one question at a time ── */}
              {!isPublished && questions.length > 0 && !hasSubmitted && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                  {(() => {
                    const q = questions[currentQuestionIndex];
                    if (!q) return null;
                    return (
                      <div key={q._id} style={{ padding: 16, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)', animation: 'fadeIn 0.3s ease-out' }}>
                        <div style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 8, ...s }}>
                          QUESTION {currentQuestionIndex + 1} OF {questions.length}
                        </div>
                        <div style={{ color: '#f5f5f5', fontSize: 15, ...s, marginBottom: 16 }}>
                          {q.order}. {q.text} {q.isRequired && <span style={{ color: '#dc2626' }}>*</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {q.options?.map((opt: any) => {
                            const isSelected = answers[q._id] === opt.id;
                            return (
                              <button 
                                key={opt.id} 
                                onClick={() => handleSelectOption(q._id, opt.id)}
                                disabled={!!answers[q._id]}
                                style={{ 
                                  display: 'flex', alignItems: 'center', gap: 12, 
                                  padding: '12px 16px', 
                                  border: isSelected ? '1px solid #dc2626' : '1px solid #27272a', 
                                  background: isSelected ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                                  cursor: answers[q._id] ? 'default' : 'pointer', 
                                  transition: 'all 0.2s', width: '100%', textAlign: 'left'
                                }}
                              >
                                <div style={{ width: 14, height: 14, borderRadius: '50%', border: isSelected ? '4px solid #dc2626' : '1px solid #52525b', transition: 'all 0.2s', flexShrink: 0 }} />
                                <span style={{ color: isSelected ? '#f5f5f5' : '#a1a1aa', fontSize: 14, ...s }}>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                        {!q.isRequired && !answers[q._id] && (
                          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={handleSkip}
                              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #52525b', color: '#a1a1aa', cursor: 'pointer', ...s, fontSize: 12 }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#f5f5f5'; e.currentTarget.style.borderColor = '#f5f5f5'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#52525b'; }}
                            >SKIP QUESTION</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Post-vote waiting message */}
              {!isPublished && hasSubmitted && (
                <div style={{ marginTop: 16, color: '#22c55e', fontSize: 13, ...s, textAlign: 'center', lineHeight: 1.8 }}>
                  ✓ RESPONSES RECORDED<br />
                  <span style={{ color: '#a1a1aa', fontSize: 11 }}>Waiting for creator to publish results...</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Footer />
    </div>
  );
}

