import { useEffect, useState } from 'react';
import { authFetch, backendUrl } from '../utils/auth';

const s = { fontFamily: '"Space Mono", monospace' } as const;

/* ── tiny helpers ── */
const Stat = ({ label, value, color = '#f5f5f5', note }: { label: string; value: string | number; color?: string; note: string }) => (
  <div style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ fontSize: 10, color: '#71717a', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 32, color, ...s, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: '#52525b', lineHeight: 1.5 }}>{note}</div>
  </div>
);

const BarChart = ({ data, color = '#dc2626', label }: { data: { label: string; count: number }[]; color?: string; label: string }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <div style={{ fontSize: 10, color: '#71717a', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: '#52525b' }}>{d.count > 0 ? d.count : ''}</div>
            <div style={{
              width: '100%', background: color, opacity: 0.7 + 0.3 * (d.count / max),
              height: `${Math.max((d.count / max) * 60, d.count > 0 ? 4 : 0)}px`,
              transition: 'height 0.6s ease', minHeight: d.count > 0 ? 4 : 0
            }} />
            <div style={{ fontSize: 9, color: '#52525b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HBar = ({ label, count, pct, isWinner }: { label: string; count: number; pct: number; isWinner: boolean }) => (
  <div style={{ position: 'relative', padding: '8px 12px', border: `1px solid ${isWinner ? '#22c55e40' : '#27272a'}`, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: isWinner ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.12)', transition: 'width 0.8s ease' }} />
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: '#e4e4e7' }}>{isWinner ? '🏆 ' : ''}{label}</span>
      <span style={{ fontSize: 11, color: '#a1a1aa' }}>{pct}% <span style={{ color: '#f5f5f5' }}>({count})</span></span>
    </div>
  </div>
);

const Note = ({ text }: { text: string }) => (
  <div style={{ fontSize: 10, color: '#52525b', borderLeft: '2px solid #27272a', paddingLeft: 8, marginTop: 6, lineHeight: 1.5 }}>{text}</div>
);

const SectionTitle = ({ children }: { children: string }) => (
  <div style={{ fontSize: 11, color: '#dc2626', letterSpacing: '0.15em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #27272a' }}>{children}</div>
);

/* ═══════════════════════════════════════
   OVERALL ANALYTICS
   ═══════════════════════════════════════ */
export function OverallAnalytics({ pollCount }: { pollCount: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${backendUrl}/api/polls/analytics/overview`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pollCount]);

  if (loading) return (
    <div style={{ color: '#a1a1aa', fontSize: 12, ...s, padding: 32, textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
      LOADING ANALYTICS...
    </div>
  );

  if (!data) return (
    <div style={{ color: '#a1a1aa', fontSize: 12, ...s, padding: 32, textAlign: 'center', border: '1px dashed #27272a' }}>
      No analytics data yet. Create and run your first poll!
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <SectionTitle>[ OVERALL SUMMARY ]</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Stat label="TOTAL POLLS" value={data.totalPolls} note="All polls you've ever created" />
          <Stat label="PUBLISHED" value={data.publishedPolls} color="#22c55e" note="Polls with results publicly visible" />
          <Stat label="LIVE NOW" value={data.livePolls} color="#eab308" note="Polls currently accepting votes" />
          <Stat label="DRAFTS" value={data.draftPolls} color="#71717a" note="Polls not yet started" />
          <Stat label="TOTAL VOTES" value={data.totalVotesAllTime} color="#dc2626" note="Unique voters across all your published polls" />
          <Stat label="TOTAL VIEWS" value={data.totalViews} note="Times participants opened any of your poll links" />
          <Stat label="AVG VOTERS / POLL" value={data.avgParticipation} note="Average unique voters per published poll" />
          {data.mostEngaged && (
            <Stat label="BEST POLL" value={data.mostEngaged.totalVoters + ' voters'} color="#eab308" note={`Most engaged: "${data.mostEngaged.title.slice(0, 24)}${data.mostEngaged.title.length > 24 ? '…' : ''}"`} />
          )}
        </div>
      </div>

      {data.pollsOverTime?.length > 1 && (
        <div style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
          <BarChart data={data.pollsOverTime} color="#dc2626" label="POLLS CREATED OVER TIME (BY MONTH)" />
          <Note text="Each bar = number of polls created that month. Shows your activity trend over time." />
        </div>
      )}

      {data.topPolls?.length > 0 && (
        <div>
          <SectionTitle>[ TOP POLLS BY PARTICIPATION ]</SectionTitle>
          <Note text="Your highest-engagement polls ranked by unique voter count." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {data.topPolls.map((p: any, i: number) => (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{['🥇','🥈','🥉'][i]}</span>
                <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <span style={{ fontSize: 12, color: '#dc2626', flexShrink: 0 }}>{p.totalVoters} voters</span>
                <span style={{ fontSize: 11, color: '#52525b', flexShrink: 0 }}>{p.views} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalPolls === 0 && (
        <div style={{ padding: 32, border: '1px dashed #27272a', textAlign: 'center', color: '#52525b', fontSize: 12 }}>
          Create your first poll to start seeing analytics here.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   PER-POLL ANALYTICS
   ═══════════════════════════════════════ */
export function PollAnalytics({ pollId }: { pollId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    authFetch(`${backendUrl}/api/polls/${pollId}/analytics`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pollId]);

  if (loading) return (
    <div style={{ color: '#a1a1aa', fontSize: 12, ...s, padding: 32, textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
      LOADING ANALYTICS...
    </div>
  );

  if (!data) return (
    <div style={{ color: '#a1a1aa', fontSize: 12, padding: 32, textAlign: 'center', border: '1px dashed #27272a' }}>
      Analytics unavailable for this poll yet.
    </div>
  );

  const formatDur = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const completionRate = data.views > 0 ? Math.round((data.totalVoters / data.views) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top metrics */}
      <div>
        <SectionTitle>[ POLL PERFORMANCE ]</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Stat label="TOTAL VOTERS" value={data.totalVoters} color="#dc2626" note="Unique participants who submitted responses" />
          <Stat label="PAGE VIEWS" value={data.views} note="Times someone opened this poll's link (before voting)" />
          <Stat label="CONVERSION" value={data.views > 0 ? completionRate + '%' : 'N/A'} color={completionRate > 50 ? '#22c55e' : '#eab308'} note="Voters ÷ Views — what % of visitors actually voted" />
          <Stat label="PEAK CONCURRENT" value={data.maxConcurrentUsers} note="Max participants connected at the same time during live polling" />
          {data.durationUsed !== null && (
            <Stat label="DURATION USED" value={formatDur(data.durationUsed)} note={`Out of configured ${formatDur(data.duration)}`} />
          )}
          <Stat label="QUESTIONS" value={data.totalQuestions} note="Total number of questions in this poll" />
        </div>
      </div>

      {/* Voters over time */}
      {data.votersOverTime?.length > 1 && data.votersOverTime.some((d: any) => d.count > 0) && (
        <div style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
          <BarChart data={data.votersOverTime} color="#dc2626" label="VOTERS OVER TIME" />
          <Note text="Shows when voters submitted during the live poll window. An early spike means strong initial engagement; a late spike means participants waited before voting." />
        </div>
      )}

      {/* Per-question breakdown */}
      {data.questions?.length > 0 && (
        <div>
          <SectionTitle>[ QUESTION BREAKDOWN ]</SectionTitle>
          <Note text="For each question: which option won, vote distribution, and what % of votes each option got." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {data.questions.map((q: any) => (
              <div key={q._id} style={{ padding: 16, border: '1px solid #27272a', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#f5f5f5' }}>
                    Q{q.order}. {q.text}
                    {q.isRequired && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
                  </span>
                  <span style={{ fontSize: 11, color: '#71717a', flexShrink: 0 }}>{q.totalVotes} votes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map((opt: any) => (
                    <HBar key={opt.id} label={opt.text} count={opt.count} pct={opt.pct} isWinner={opt.isWinner} />
                  ))}
                </div>
                {q.totalVotes === 0 && (
                  <div style={{ fontSize: 11, color: '#52525b', marginTop: 8 }}>No votes recorded for this question.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.status === 'draft' && (
        <div style={{ padding: 16, border: '1px dashed #27272a', color: '#52525b', fontSize: 12, textAlign: 'center' }}>
          Start the poll to begin collecting analytics data.
        </div>
      )}
    </div>
  );
}
