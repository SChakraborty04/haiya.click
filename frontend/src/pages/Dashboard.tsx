import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { authFetch, backendUrl, setAccessToken } from '../utils/auth';
import { io, Socket } from 'socket.io-client';
import { OverallAnalytics, PollAnalytics } from '../components/AnalyticsPanel';

interface User { _id: string; name: string; email: string; role: string; isVerified: boolean; }
interface Poll {
  _id: string; title: string; slug: string;
  isAnonymous: boolean; requireAuth: boolean;
  isPublished: boolean; isStarted: boolean;
  duration: number; expiryDate?: string; createdAt: string;
  resultsReady: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [selectedPollQuestions, setSelectedPollQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [liveCountdown, setLiveCountdown] = useState<number | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'analytics'>('detail');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(['', '', '', '']);
  const socketRef = useRef<Socket | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frontendOrigin = window.location.origin;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };
  const resultsPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Fetch questions + tally/results whenever selected poll changes
  useEffect(() => {
    // Clear any previous results poller
    if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }

    if (!selectedPoll) {
      setSelectedPollQuestions([]);
      setTally({});
      setResultsLoading(false);
      return;
    }

    const fetchData = async () => {
      // ── Published: fetch final results from MongoDB (no socket) ─────────
      if (selectedPoll.isPublished) {
        setResultsLoading(true);
        const tryFetch = async () => {
          try {
            const res = await authFetch(`${backendUrl}/api/polls/${selectedPoll._id}/results`);
            const json = await res.json();
            if (json.success) {
              const { poll: freshPoll, questions } = json.data;
              setSelectedPollQuestions(questions);
              if (freshPoll.resultsReady) {
                setResultsLoading(false);
                if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
                setPolls(prev => prev.map(p => p._id === freshPoll._id ? { ...p, ...freshPoll } : p));
                setSelectedPoll((prev: any) => prev ? { ...prev, resultsReady: true } : prev);
              }
            }
          } catch { /* ignore */ }
        };
        await tryFetch();
        // If not ready yet, keep polling every 2s
        if (!selectedPoll.resultsReady) {
          resultsPollerRef.current = setInterval(tryFetch, 2000);
        } else {
          setResultsLoading(false);
        }
        return;
      }

      // ── Draft or Live: fetch questions + tally from Valkey ────────────
      try {
        const res = await authFetch(`${backendUrl}/api/questions/${selectedPoll._id}`);
        const json = await res.json();
        setSelectedPollQuestions(json.success ? json.data : []);
      } catch { setSelectedPollQuestions([]); }

      if (selectedPoll.isStarted) {
        try {
          const tallyRes = await authFetch(`${backendUrl}/api/polls/${selectedPoll._id}/tally`);
          const tallyJson = await tallyRes.json();
          if (tallyJson.success) setTally(tallyJson.data);
        } catch { /* ignore */ }
      } else {
        setTally({});
      }
    };
    fetchData();

    return () => {
      if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
    };
  }, [selectedPoll?._id, selectedPoll?.isPublished]);

  // Manage socket — only for LIVE (not-yet-published) polls
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!selectedPoll) return;
    // Only live, not-yet-published polls need a socket
    if (!selectedPoll.isStarted || selectedPoll.isPublished) return;

    const socket = io(backendUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-poll', { pollId: selectedPoll._id });
    });

    socket.on('VOTE_PULSE', (data: { qId: string; oId: string; newCount: number }) => {
      setTally(prev => ({ ...prev, [`q:${data.qId}:opt:${data.oId}`]: data.newCount }));
    });

    // When poll is published (auto or manual), switch to results poller
    socket.on('POLL_PUBLISHED', (data: { pollId: string }) => {
      socket.disconnect();
      socketRef.current = null;
      const updated = { ...selectedPoll, isPublished: true, resultsReady: false };
      setPolls(prev => prev.map(p => p._id === selectedPoll._id ? updated : p));
      setSelectedPoll(updated);
      setConnectedUsers(null);
    });

    socket.on('RESULTS_READY', (data: { pollId: string }) => {
      if (data.pollId === selectedPoll._id) {
        setResultsLoading(false);
        if (resultsPollerRef.current) { clearInterval(resultsPollerRef.current); resultsPollerRef.current = null; }
        setPolls(prev => prev.map(p => p._id === selectedPoll._id ? { ...p, resultsReady: true } : p));
        setSelectedPoll(prev => prev ? { ...prev, resultsReady: true } : prev);
      }
    });

    socket.on('USERS_COUNT', (data: { pollId: string; count: number }) => {
      if (data.pollId === selectedPoll._id) setConnectedUsers(data.count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectedUsers(null);
    };
  }, [selectedPoll?._id, selectedPoll?.isStarted, selectedPoll?.isPublished]);

  // Countdown timer for live polls
  useEffect(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setLiveCountdown(null);

    if (!selectedPoll?.isStarted || selectedPoll?.isPublished || !selectedPoll?.expiryDate) return;

    const target = new Date(selectedPoll.expiryDate).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setLiveCountdown(diff);
      if (diff <= 0 && countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);

    return () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  }, [selectedPoll?._id, selectedPoll?.isStarted, selectedPoll?.isPublished, selectedPoll?.expiryDate]);

  // Initial data fetch
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const resUser = await authFetch(`${backendUrl}/api/auth/me`);
        const jsonUser = await resUser.json();
        if (jsonUser.success) {
          setUser(jsonUser.data);
          const resPolls = await authFetch(`${backendUrl}/api/polls/my-polls`);
          const jsonPolls = await resPolls.json();
                  if (jsonPolls.success && Array.isArray(jsonPolls.data)) {
            // Sort newest first
            const sorted = [...jsonPolls.data].sort((a: Poll, b: Poll) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setPolls(sorted);
          }
        } else {
          setAccessToken(''); navigate('/login');
        }
      } catch { setAccessToken(''); navigate('/login'); }
      finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    try { await authFetch(`${backendUrl}/api/auth/logout`, { method: 'POST' }); } catch { }
    setAccessToken(''); navigate('/');
  };

  const handlePublish = async () => {
    if (!selectedPoll) return;
    try {
      const res = await authFetch(`${backendUrl}/api/polls/${selectedPoll._id}/publish`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const updated = { ...selectedPoll, isPublished: true, resultsReady: false };
        setPolls(polls.map(p => p._id === selectedPoll._id ? updated : p));
        setSelectedPoll(updated);
        setResultsLoading(true);
      } else { alert(json.message || 'Failed to publish'); }
    } catch { alert('Failed to publish'); }
  };

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5f5f5', fontFamily: '"Space Mono", monospace' }}>
      <div style={{ animation: 'pulse 1.5s infinite', letterSpacing: '0.2em' }}>[ LOADING... ]</div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );

  const s = { fontFamily: '"Space Mono", monospace' } as const;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', paddingTop: '57px', boxSizing: 'border-box' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'none',
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#dc2626',
              border: 'none',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              zIndex: 100,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
            }}
            className="sidebar-fab"
          >
            ☰
          </button>

        {/* Sidebar */}
        <aside style={{
          width: 280,
          borderRight: '1px solid #27272a',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10,10,10,0.8)',
          flexShrink: 0,
        }}
          className={`dashboard-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        >
        <div style={{ padding: 24, borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 11, letterSpacing: '0.1em', color: '#dc2626' }}>[ MY POLLS ]</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSelectedPoll(null); setIsCreatingPoll(false); setSidebarOpen(false); }}
              style={{ background: 'transparent', border: '1px solid #52525b', color: '#a1a1aa', padding: '4px 8px', fontSize: 11, cursor: 'pointer', ...s }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#52525b'; e.currentTarget.style.color = '#a1a1aa'; }}>
              ⌂ HOME
            </button>
              <button onClick={() => { setSelectedPoll(null); setIsCreatingPoll(true); setSidebarOpen(false); }}
              style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', padding: '4px 8px', fontSize: 12, cursor: 'pointer', ...s }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }}>
              + NEW
            </button>
            <button onClick={() => setSidebarOpen(false)} className="sidebar-close-btn" style={{ background: 'transparent', border: '1px solid #27272a', color: '#a1a1aa', padding: '4px 8px', fontSize: 12, cursor: 'pointer', ...s, display: 'none' }}>✕</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {polls.length === 0 ? (
              <div style={{ padding: '0 24px 16px', color: '#a1a1aa', fontSize: 12 }}>No polls yet. Create one →</div>
            ) : polls.map(poll => (
              <div key={poll._id}
                onClick={() => { setSelectedPoll(poll); setIsCreatingPoll(false); setActiveTab('detail'); setSidebarOpen(false); }}
                style={{ padding: '16px 24px', cursor: 'pointer', background: selectedPoll?._id === poll._id && !isCreatingPoll ? 'rgba(220,38,38,0.1)' : 'transparent', borderLeft: selectedPoll?._id === poll._id && !isCreatingPoll ? '2px solid #dc2626' : '2px solid transparent', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (selectedPoll?._id !== poll._id || isCreatingPoll) e.currentTarget.style.background = 'rgba(39,39,42,0.5)'; }}
                onMouseLeave={e => { if (selectedPoll?._id !== poll._id || isCreatingPoll) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ fontSize: 14, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poll.title || 'Untitled Poll'}</div>
                <div style={{ fontSize: 10, color: '#a1a1aa', display: 'flex', gap: 12 }}>
                  <span style={{ color: poll.isPublished ? '#22c55e' : poll.isStarted ? '#eab308' : '#a1a1aa' }}>
                    {poll.isPublished ? 'PUBLISHED' : poll.isStarted ? 'LIVE' : 'DRAFT'}
                  </span>
                  <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }} className="dashboard-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a', paddingBottom: 16, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 18, letterSpacing: '0.08em' }}>[ DASHBOARD ]</h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#a1a1aa' }}>{user?.name?.toUpperCase()}</div>
              <button onClick={handleLogout}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', cursor: 'pointer', ...s, letterSpacing: '0.1em', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }}>
                LOGOUT
              </button>
            </div>
          </div>

          {/* Stats / Overall analytics (shown when no poll selected and not creating) */}
          {!isCreatingPoll && !selectedPoll && (
            <div style={{ marginBottom: 48 }}>
              <OverallAnalytics pollCount={polls.length} />
            </div>
          )}

          {/* Create Poll Form */}
          {isCreatingPoll && (
            <div style={{ border: '1px solid #27272a', padding: 32, background: 'rgba(10,10,10,0.8)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 20, letterSpacing: '0.1em', color: '#dc2626' }}>[ CREATE NEW POLL ]</h2>
              <form onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const durationMins = parseInt((form.elements.namedItem('durationMins') as HTMLInputElement).value) || 0;
                const durationSecs = parseInt((form.elements.namedItem('durationSecs') as HTMLInputElement).value) || 0;
                const isAnonymous = (form.elements.namedItem('isAnonymous') as HTMLInputElement).checked;
                const requireAuth = (form.elements.namedItem('requireAuth') as HTMLInputElement).checked;
                
                const totalDuration = (durationMins * 60) + durationSecs;
                if (!title || totalDuration <= 0) return alert('Title and Duration (at least 1s) are required.');
                try {
                  const res = await authFetch(`${backendUrl}/api/polls`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, duration: totalDuration, isAnonymous, requireAuth })
                  });
                  const json = await res.json();
                  if (json.success) { setPolls([json.data, ...polls]); setIsCreatingPoll(false); setSelectedPoll(json.data); }
                  else alert(json.message || 'Failed to create poll');
                } catch { alert('Network Error'); }
              }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>POLL TITLE</label>
                  <input name="title" required placeholder="E.g. Q4 Feedback" style={{ padding: 12, background: 'transparent', border: '1px solid #27272a', color: '#fff', ...s }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>POLL DURATION</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" name="durationMins" min="0" defaultValue="10" style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #27272a', color: '#fff', ...s }} />
                      <span style={{ fontSize: 10, color: '#a1a1aa' }}>MINS</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" name="durationSecs" min="0" max="59" defaultValue="0" style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #27272a', color: '#fff', ...s }} />
                      <span style={{ fontSize: 10, color: '#a1a1aa' }}>SECS</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#a1a1aa', cursor: 'pointer' }}>
                    <input type="checkbox" name="isAnonymous" defaultChecked style={{ width: 16, height: 16, accentColor: '#dc2626' }} /> Anonymous Poll Creation (Enable it if you don't want to show your details to Users)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#a1a1aa', cursor: 'pointer' }}>
                    <input type="checkbox" name="requireAuth" style={{ width: 16, height: 16, accentColor: '#dc2626' }} /> Require Auth (Enable it if you want that users should be authenticated before polling.)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button type="submit" style={{ flex: 1, padding: 12, background: '#dc2626', border: '1px solid #dc2626', color: '#fff', cursor: 'pointer', ...s }}>CREATE POLL</button>
                  <button type="button" onClick={() => setIsCreatingPoll(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #27272a', color: '#a1a1aa', cursor: 'pointer', ...s }}>CANCEL</button>
                </div>
              </form>
            </div>
          )}

          {/* Selected Poll View */}
          {!isCreatingPoll && selectedPoll && (
            <div style={{ border: '1px solid #27272a', padding: 32, background: 'rgba(10,10,10,0.8)' }}>
              {/* Tab bar — only when poll is selected */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #27272a' }}>
                {(['detail', 'analytics'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '8px 20px', background: 'transparent', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #dc2626' : '2px solid transparent',
                    color: activeTab === tab ? '#f5f5f5' : '#71717a', cursor: 'pointer',
                    fontSize: 11, letterSpacing: '0.12em', ...s, marginBottom: -1, transition: 'color 0.2s'
                  }}>
                    {tab === 'detail' ? '[ POLL DETAIL ]' : '[ ANALYTICS ]'}
                  </button>
                ))}
              </div>

              {activeTab === 'analytics' ? (
                <PollAnalytics pollId={selectedPoll._id} />
              ) : (<>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20, letterSpacing: '0.1em' }}>{selectedPoll.title}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 12, padding: '4px 12px', border: `1px solid ${selectedPoll.isPublished ? '#22c55e' : selectedPoll.isStarted ? '#eab308' : '#a1a1aa'}`, color: selectedPoll.isPublished ? '#22c55e' : selectedPoll.isStarted ? '#eab308' : '#a1a1aa' }}>
                    {selectedPoll.isPublished ? 'PUBLISHED' : selectedPoll.isStarted ? '● LIVE' : 'DRAFT'}
                  </span>
                  {/* Countdown + users when live */}
                  {selectedPoll.isStarted && !selectedPoll.isPublished && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {liveCountdown !== null && (
                        <span style={{
                          fontSize: 13,
                          letterSpacing: '0.08em',
                          color: liveCountdown <= 30 ? '#ef4444' : liveCountdown <= 120 ? '#eab308' : '#22c55e',
                          padding: '3px 10px',
                          border: `1px solid ${liveCountdown <= 30 ? '#ef444440' : liveCountdown <= 120 ? '#eab30840' : '#22c55e40'}`,
                          background: liveCountdown <= 30 ? 'rgba(239,68,68,0.06)' : 'transparent',
                          transition: 'color 0.5s, border-color 0.5s',
                          ...s
                        }}>
                          ⌛ {liveCountdown > 0 ? formatCountdown(liveCountdown) + ' LEFT' : 'CLOSING...'}
                        </span>
                      )}
                      {connectedUsers !== null && (
                        <span style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.08em', ...s }}>
                          👥 {connectedUsers} connected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Poll meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {/* Shareable Link — full width copyable row */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: '#a1a1aa', fontSize: 11, letterSpacing: '0.1em' }}>SHAREABLE LINK</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', padding: '8px 12px', borderRadius: 2 }}>
                    <span style={{ fontSize: 13, color: '#dc2626', flex: 1, wordBreak: 'break-all', ...s }}>
                      {`${frontendOrigin}/p/${selectedPoll.slug}`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${frontendOrigin}/p/${selectedPoll.slug}`, 'meta-link')}
                      title="Copy link"
                      style={{ background: 'transparent', border: '1px solid #dc262640', color: copiedKey === 'meta-link' ? '#22c55e' : '#dc2626', padding: '4px 10px', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em', flexShrink: 0, transition: 'all 0.2s', ...s }}
                    >
                      {copiedKey === 'meta-link' ? '✓ COPIED' : '⧉ COPY'}
                    </button>
                  </div>
                </div>
                {/* Other meta items */}
                {[
                  ['ANONYMOUS', selectedPoll.isAnonymous ? 'YES' : 'NO', ''],
                  ['REQUIRE AUTH', selectedPoll.requireAuth ? 'YES' : 'NO', ''],
                  ['DURATION', `${Math.floor(selectedPoll.duration / 60)}m ${selectedPoll.duration % 60}s`, ''],
                  ['EXPIRY', selectedPoll.expiryDate ? new Date(selectedPoll.expiryDate).toLocaleString() : 'PENDING START', ''],
                ].map(([label, value, color]) => (
                  <div key={label as string} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: '#a1a1aa', fontSize: 11, letterSpacing: '0.1em' }}>{label}</span>
                    <span style={{ fontSize: 13, color: (color as string) || '#f5f5f5' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ─── QUESTIONS & RESULTS ─── always shown when questions exist */}
              {selectedPollQuestions.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '0.1em', color: '#dc2626' }}>
                      {selectedPoll.isPublished ? '[ FINAL RESULTS ]' : selectedPoll.isStarted ? '[ LIVE RESULTS ]' : '[ QUESTIONS ]'}
                    </h3>
                    {selectedPoll.isPublished && resultsLoading && (
                      <span style={{ fontSize: 11, color: '#eab308', letterSpacing: '0.1em', animation: 'pulse 1.5s infinite' }}>
                        ⏳ SYNCING TO DATABASE...
                      </span>
                    )}
                    {selectedPoll.isPublished && !resultsLoading && (
                      <span style={{ fontSize: 11, color: '#22c55e', letterSpacing: '0.1em' }}>✓ FINAL</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {selectedPollQuestions.map((q: any) => {
                      // Published: use opt.count from MongoDB; Live: use Valkey tally
                      const getCount = (opt: any) =>
                        selectedPoll.isPublished ? (opt.count || 0) : (tally[`q:${q._id}:opt:${opt.id}`] || 0);
                      const totalVotes = q.options.reduce((sum: number, opt: any) => sum + getCount(opt), 0);
                      return (
                        <div key={q._id} style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{ fontSize: 14 }}>
                              {q.order}. {q.text} {q.isRequired && <span style={{ color: '#dc2626' }}>*</span>}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {(selectedPoll.isStarted || selectedPoll.isPublished) && (
                                <span style={{ fontSize: 11, color: '#a1a1aa' }}>{totalVotes} votes</span>
                              )}
                              {!selectedPoll.isStarted && !selectedPoll.isPublished && (
                                <button onClick={async () => {
                                  if (!confirm('Delete this question?')) return;
                                  try {
                                    const res = await authFetch(`${backendUrl}/api/questions/${q._id}`, { method: 'DELETE' });
                                    if (res.ok) setSelectedPollQuestions(prev => prev.filter(x => x._id !== q._id));
                                  } catch { alert('Failed to delete'); }
                                }} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 14 }}>✕</button>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {q.options.map((opt: any) => {
                                      const count = getCount(opt);
                                      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                      const showBars = selectedPoll.isStarted || selectedPoll.isPublished;
                                      return (
                                        <div key={opt.id} style={{ position: 'relative', padding: '10px 14px', border: '1px solid #27272a', overflow: 'hidden' }}>
                                          {showBars && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: selectedPoll.isPublished ? 'rgba(34,197,94,0.18)' : 'rgba(220,38,38,0.18)', transition: 'width 0.6s ease', zIndex: 0 }} />
                                          )}
                                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, color: '#e4e4e7' }}>{opt.text}</span>
                                            {showBars && (
                                              <span style={{ fontSize: 12, color: '#a1a1aa', marginLeft: 16, whiteSpace: 'nowrap' }}>
                                                {pct}% <span style={{ color: '#f5f5f5' }}>({count})</span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── ADD QUESTION FORM (draft only) ─── */}
              {!selectedPoll.isStarted && !selectedPoll.isPublished && (
                <div style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid #27272a' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: '0.1em', color: '#a1a1aa' }}>ADD NEW QUESTION</h3>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const text = (form.elements.namedItem('text') as HTMLInputElement).value;
                    const isReq = (form.elements.namedItem('isRequired') as HTMLInputElement).checked;
                    const opts = newQuestionOptions
                      .map((t, i) => ({ id: `o${i + 1}`, text: t.trim() }))
                      .filter(o => o.text !== '');
                    if (opts.length < 2) return alert('At least 2 non-empty options required');
                    const newOrder = selectedPollQuestions.length > 0 ? Math.max(...selectedPollQuestions.map(q => q.order || 0)) + 1 : 1;
                    try {
                      const res = await authFetch(`${backendUrl}/api/questions/${selectedPoll._id}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order: newOrder, text, isRequired: isReq, options: opts })
                      });
                      const json = await res.json();
                      if (json.success) {
                        setSelectedPollQuestions([...selectedPollQuestions, json.data]);
                        setNewQuestionOptions(['', '', '', '']);
                        form.reset();
                      } else alert(json.message);
                    } catch { alert('Failed to add question'); }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input name="text" placeholder="Question Text" required style={{ padding: 12, background: 'transparent', border: '1px solid #27272a', color: '#fff', ...s }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#71717a', letterSpacing: '0.08em' }}>OPTIONS (min 2 required)</div>
                      {newQuestionOptions.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={opt}
                            onChange={e => setNewQuestionOptions(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                            placeholder={i < 2 ? `Option ${i + 1} *` : `Option ${i + 1} (optional)`}
                            style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${i < 2 && opt.trim() === '' ? '#52525b' : '#27272a'}`, color: '#fff', ...s }}
                          />
                          {newQuestionOptions.length > 2 && (
                            <button type="button" onClick={() => setNewQuestionOptions(prev => prev.filter((_, idx) => idx !== i))}
                              title="Remove option"
                              style={{ background: 'transparent', border: '1px solid #27272a', color: '#71717a', padding: '11px 14px', cursor: 'pointer', fontSize: 14, flexShrink: 0, lineHeight: 1 }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#71717a'; }}
                            >✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setNewQuestionOptions(prev => [...prev, ''])}
                        style={{ padding: '8px 12px', background: 'transparent', border: '1px dashed #27272a', color: '#71717a', cursor: 'pointer', fontSize: 11, letterSpacing: '0.1em', ...s, textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#71717a'; }}
                      >+ ADD OPTION</button>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#a1a1aa', cursor: 'pointer' }}>
                      <input type="checkbox" name="isRequired" style={{ width: 16, height: 16, accentColor: '#dc2626' }} /> Mandatory Question
                    </label>
                    <button type="submit" style={{ padding: 12, background: 'transparent', border: '1px solid #52525b', color: '#f5f5f5', cursor: 'pointer', ...s }}>ADD QUESTION</button>
                  </form>
                </div>
              )}

              {/* ─── ACTION BUTTONS ─── */}
              {!selectedPoll.isPublished && (
                <div style={{ display: 'flex', gap: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid #27272a' }}>
                  {!selectedPoll.isStarted && (
                    <button onClick={async () => {
                      try {
                        const res = await authFetch(`${backendUrl}/api/polls/${selectedPoll._id}/start`, { method: 'POST' });
                        const json = await res.json();
                        if (json.success || res.status === 200) {
                          // Pick up expiryDate from the response so countdown starts immediately
                          const expiryDate = json.data?.expiryDate || null;
                          const updated = { ...selectedPoll, isStarted: true, expiryDate };
                          setPolls(polls.map(p => p._id === selectedPoll._id ? updated : p));
                          setSelectedPoll(updated);
                        }
                      } catch { alert('Failed to start poll'); }
                    }} style={{ flex: 1, padding: 12, background: '#eab308', border: '1px solid #eab308', color: '#000', cursor: 'pointer', ...s, letterSpacing: '0.05em' }}>
                      START POLL (LIVE)
                    </button>
                  )}
                  {selectedPoll.isStarted && (
                    <button onClick={handlePublish}
                      style={{ flex: 1, padding: 12, background: '#22c55e', border: '1px solid #22c55e', color: '#000', cursor: 'pointer', ...s, letterSpacing: '0.05em' }}>
                      END & PUBLISH RESULTS
                    </button>
                  )}
                </div>
              )}

              {/* Published notice */}
              {selectedPoll.isPublished && (
                <div style={{ marginTop: 24, padding: 16, border: '1px solid #22c55e', background: 'rgba(34,197,94,0.05)', fontSize: 12, letterSpacing: '0.08em' }}>
                  <div style={{ color: '#22c55e', marginBottom: 10, textAlign: 'center' }}>✓ RESULTS PUBLISHED </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', padding: '8px 12px', borderRadius: 2 }}>
                    SHARABLE LINK:
                    <span style={{ flex: 1, color: '#22c55e', wordBreak: 'break-all', ...s }}>
                      {`${frontendOrigin}/p/${selectedPoll.slug}`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${frontendOrigin}/p/${selectedPoll.slug}`, 'published-link')}
                      title="Copy results link"
                      style={{ background: 'transparent', border: '1px solid #22c55e60', color: copiedKey === 'published-link' ? '#f5f5f5' : '#22c55e', padding: '4px 10px', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em', flexShrink: 0, transition: 'all 0.2s', ...s }}
                    >
                      {copiedKey === 'published-link' ? '✓ COPIED' : '⧉ COPY'}
                    </button>
                  </div>
                </div>
                )}
              </>
              )}
            </div>
          )}


          {/* Empty state */}
          {!isCreatingPoll && !selectedPoll && (
            <div style={{ padding: 48, border: '1px dashed #27272a', textAlign: 'center', color: '#a1a1aa', fontSize: 14 }}>
              Select a poll from the sidebar or create a new one.
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style>{`
        /* Mobile responsive dashboard */
        @media (min-width: 641px) {
          .dashboard-main { padding: 40px 48px !important; }
        }
        @media (max-width: 640px) {
          .dashboard-sidebar {
            position: fixed !important;
            left: -100% !important;
            top: 57px !important;
            bottom: 0 !important;
            width: 85vw !important;
            max-width: 300px !important;
            z-index: 90 !important;
            transition: left 0.3s ease !important;
            overflow-y: auto !important;
          }
          .dashboard-sidebar.sidebar-open {
            left: 0 !important;
          }
          .sidebar-fab {
            display: flex !important;
          }
          .sidebar-close-btn {
            display: block !important;
          }
        }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
