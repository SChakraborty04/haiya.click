import { useRef, useEffect, useState } from 'react';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span style={{ color: '#f5f5f5', fontSize: 18, letterSpacing: '0.1em' }}>{time}</span>;
}

function ASCIIBarChart({ votes }: { votes: number[] }) {
  const MAX_BARS = 8;
  const generateBars = (vote: number) => {
    // Determine how many blocks should be "lit up" based on percentage
    const activeBarsCount = Math.max(1, Math.ceil((vote / 100) * MAX_BARS));
    return Array.from({ length: MAX_BARS }).map((_, i) => {
      // i = 0 is the bottom block because of column-reverse
      if (i < activeBarsCount) {
        // Add a slight flicker to the lit blocks for that terminal feel
        return 0.6 + Math.random() * 0.4;
      }
      // Unlit blocks are invisible but take up space to keep chart height stable
      return 0;
    });
  };

  const haiBars = generateBars(votes[0]);
  const iyaBars = generateBars(votes[1]);
  const maybeBars = generateBars(votes[2]);
  const notBars = generateBars(votes[3]);

  const renderCol = (label: string, bars: number[], color: string, pct: number, char: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <span style={{ fontSize: 10, color, letterSpacing: '0.1em' }}>{label} {pct}%</span>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 1 }}>
        {bars.map((opacity, i) => (
          <span key={i} style={{ fontSize: 12, lineHeight: 1, color, opacity: opacity }}>{char}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Space Mono", monospace', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        {renderCol('HAI', haiBars, '#dc2626', votes[0], '█')}
        {renderCol('IYA', iyaBars, '#a1a1aa', votes[1], '░')}
        {renderCol('M/B', maybeBars, '#a1a1aa', votes[2], '▒')}
        {renderCol('N/A', notBars, '#a1a1aa', votes[3], '▓')}
      </div>
    </div>
  );
}

function HoverTooltip({ text, tooltip }: { text: string; tooltip: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', cursor: 'help', borderBottom: '1px dotted rgba(245,245,245,0.4)' }}
    >
      {text}
      {isHovered && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          padding: '4px 8px',
          background: '#27272a',
          color: '#f5f5f5',
          fontSize: 10,
          fontFamily: '"Space Mono", monospace',
          letterSpacing: '0.1em',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: '#27272a transparent transparent transparent'
          }}></div>
        </span>
      )}
    </span>
  );
}

const STREAM_LINES_LEFT = [
  '> ANONYMOUS/AUTHENTICATED MODES',
  '> LINK EXPIRY SYSTEM [SET DURATION]',
  '> VALIDATION HANDLER (REQ/OPT)',
  '> WEBSOCKET UPDATES',
  '> BINARY CHOICE ENGINE',
  '> HORIZONTAL VOTING LAYOUT',
  '> TAG-BASED CATEGORIZATION',
  '> PUBLIC LINK GENERATION',
];

const STREAM_LINES_RIGHT = [
  '< REAL-TIME INSIGHTS',
  '< POLL ANALYTICS DASHBOARD',
  '< EXPORT TO CSV / JSON',
  '< CUSTOM STYLING OPTIONS',
  '< EMBEDDABLE WIDGETS',
  '< QR CODE GENERATION',
  '< AUDIT LOG / HISTORY',
  '< IP-BASED VOTE LIMITING',
];

export default function FeatureGrid() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isStatusHovered, setIsStatusHovered] = useState(false);
  const [isTextHovered, setIsTextHovered] = useState(false);
  const [isCoreHovered, setIsCoreHovered] = useState(false);
  const [coreVotes, setCoreVotes] = useState([60, 40, 0, 0]);
  const [isInsightHovered, setIsInsightHovered] = useState(false);
  const [insightVotes, setInsightVotes] = useState([60, 20, 10, 10]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isCoreHovered) {
      setCoreVotes([60, 40, 0, 0]);
      return;
    }
    const interval = setInterval(() => {
      let v1 = Math.floor(Math.random() * 40) + 10;
      let v2 = Math.floor(Math.random() * 30) + 10;
      let v3 = Math.floor(Math.random() * 20) + 5;
      let v4 = 100 - v1 - v2 - v3;
      setCoreVotes([v1, v2, v3, v4]);
    }, 150);
    return () => clearInterval(interval);
  }, [isCoreHovered]);

  useEffect(() => {
    if (!isInsightHovered) {
      setInsightVotes([60, 20, 10, 10]);
      return;
    }
    const interval = setInterval(() => {
      let v1 = Math.floor(Math.random() * 40) + 10;
      let v2 = Math.floor(Math.random() * 30) + 10;
      let v3 = Math.floor(Math.random() * 20) + 5;
      let v4 = 100 - v1 - v2 - v3;
      setInsightVotes([v1, v2, v3, v4]);
    }, 150);
    return () => clearInterval(interval);
  }, [isInsightHovered]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current && glowRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          glowRef.current.style.opacity = '1';
          glowRef.current.style.transform = `translate(${e.clientX - rect.left - 40}px, ${e.clientY - rect.top - 40}px)`;
        } else {
          glowRef.current.style.opacity = '0';
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const muted: React.CSSProperties = { color: '#a1a1aa', fontSize: 10, letterSpacing: '0.3em', fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' };
  const borderR: React.CSSProperties = { borderRight: '1px solid #27272a' };
  const borderB: React.CSSProperties = { borderBottom: '1px solid #27272a' };
  const panelPad: React.CSSProperties = { padding: 32 };

  return (
    <div id="features" ref={sectionRef} style={{ borderTop: '1px solid #27272a', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes status-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scroll-down {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>
      {/* Glowing light effect */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, rgba(220,38,38,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', ...borderB }}>
          <div style={{ ...panelPad, ...borderR }}>
            <p style={muted}>TIME</p>
            <div style={{ marginTop: 8 }}><LiveClock /></div>
            <p style={{ color: '#ff1a1a', fontSize: 10, marginTop: 16 }}>● LIVE</p>
          </div>
          <div style={{ ...panelPad, ...borderR, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
            <div style={{
              position: 'absolute',
              width: 192,
              height: 192,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(220,38,38,0.4) 0%, rgba(220,38,38,0.1) 50%, transparent 70%)',
              filter: 'blur(24px)',
            }}></div>
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <p style={muted}>ORIGIN</p>
              <p style={{ color: '#f5f5f5', fontSize: 20, letterSpacing: '0.1em', marginTop: 4 }}>
                <HoverTooltip text="HAI" tooltip="YES" /> / <HoverTooltip text="IYA" tooltip="NO" />
              </p>
            </div>
          </div>
          <div
            style={{ ...panelPad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={() => setIsStatusHovered(true)}
            onMouseLeave={() => setIsStatusHovered(false)}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={muted}>STATUS</p>
              <p style={{ color: '#f5f5f5', fontSize: 14, letterSpacing: '0.1em', marginTop: 4 }}>REAL-TIME</p>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={{
                  color: '#ff1a1a',
                  fontSize: 16,
                  animation: isStatusHovered ? 'status-blink 1s ease-in-out infinite' : 'none'
                }}>●</span>
                <span style={{ color: '#a1a1aa', fontSize: 12, letterSpacing: '0.1em' }}>ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Japanese text */}
        <div style={{ ...borderB, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 128, height: 1, background: '#dc2626', margin: '0 auto 16px' }}></div>
          <div
            style={{ maxWidth: 500, margin: '0 auto', cursor: 'default', position: 'relative' }}
            onMouseEnter={() => setIsTextHovered(true)}
            onMouseLeave={() => setIsTextHovered(false)}
          >
            {/* English Text (Background Layer) */}
            <p style={{
              color: '#dfdfdfff',
              fontSize: 10,
              letterSpacing: '0.05em',
              fontFamily: '"Space Mono", monospace',
              lineHeight: 1.6,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              opacity: isTextHovered ? 1 : 0,
              transition: 'opacity 0.4s ease',
              zIndex: 0
            }}>
              Turning the noise of indecision into the clarity of data.
            </p>

            {/* Japanese Text (Foreground Layer) */}
            <p style={{
              color: '#a1a1aa',
              fontSize: 12,
              letterSpacing: '0.1em',
              lineHeight: 1.6,
              opacity: isTextHovered ? 0 : 1,
              transition: 'opacity 0.4s ease',
              position: 'relative',
              zIndex: 1
            }}>
              優柔不断という雑音を、データの明快さへと変える。
            </p>
          </div>
          <div style={{ width: 128, height: 1, background: '#dc2626', margin: '16px auto 0' }}></div>
        </div>

        {/* Bottom panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Left: Core Choice */}
          <div
            style={{
              ...panelPad,
              ...borderR,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 0.7s ease',
            }}
            onMouseEnter={() => setIsCoreHovered(true)}
            onMouseLeave={() => setIsCoreHovered(false)}
          >
            <p style={muted}>THE CORE CHOICE</p>
            <h2 style={{ color: '#f5f5f5', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '-0.02em', marginTop: 24, marginBottom: 32, fontWeight: 400, lineHeight: 1.2 }}>
              ONE VOTE.<br />ONE ANSWER.
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              <button style={{ padding: '10px 16px', border: '1px solid #27272a', background: 'transparent', color: '#f5f5f5', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: '"Space Mono", monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><span style={{ color: '#ff1a1a', marginRight: 8 }}>○</span>HAI (Yes)</span>
                <span>{coreVotes[0]}%</span>
              </button>
              <button style={{ padding: '10px 16px', border: '1px solid #27272a', background: 'transparent', color: '#f5f5f5', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: '"Space Mono", monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><span style={{ color: '#a1a1aa', marginRight: 8 }}>✕</span>IYA (No)</span>
                <span>{coreVotes[1]}%</span>
              </button>
              <button style={{ padding: '10px 16px', border: '1px solid #27272a', background: 'transparent', color: '#f5f5f5', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: '"Space Mono", monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><span style={{ color: '#a1a1aa', marginRight: 8 }}>?</span>MAYBE</span>
                <span>{coreVotes[2]}%</span>
              </button>
              <button style={{ padding: '10px 16px', border: '1px solid #27272a', background: 'transparent', color: '#f5f5f5', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: '"Space Mono", monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><span style={{ color: '#a1a1aa', marginRight: 8 }}>-</span>NOT INTERESTED</span>
                <span>{coreVotes[3]}%</span>
              </button>
            </div>

            <div style={{ height: 60, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
              <div style={{ animation: 'scroll-up 15s linear infinite' }}>
                {[...STREAM_LINES_LEFT, ...STREAM_LINES_LEFT].map((line, i) => (
                  <p key={i} style={{ color: '#a1a1aa', fontSize: 11, letterSpacing: '0.08em', fontFamily: '"Space Mono", monospace', marginBottom: 10 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Instant Insights */}
          <div
            style={{
              ...panelPad,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 0.7s ease 0.2s',
            }}
            onMouseEnter={() => setIsInsightHovered(true)}
            onMouseLeave={() => setIsInsightHovered(false)}
          >
            <p style={muted}>INSTANT INSIGHTS</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, marginBottom: 24 }}>
              <div>
                <p style={muted}>TIME</p>
                <p style={{ color: '#f5f5f5', fontSize: 13, letterSpacing: '0.1em', marginTop: 4 }}>REAL-TIME</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={muted}>STATUS</p>
                <p style={{ color: '#ff1a1a', fontSize: 13, letterSpacing: '0.1em', marginTop: 4 }}>LIVE</p>
              </div>
            </div>

            <div style={{ border: '1px solid #27272a', padding: 24, marginBottom: 16 }}>
              <ASCIIBarChart votes={insightVotes} />
            </div>

            <div style={{ height: 60, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
              <div style={{ animation: 'scroll-down 15s linear infinite' }}>
                {[...STREAM_LINES_RIGHT, ...STREAM_LINES_RIGHT].map((line, i) => (
                  <p key={i} style={{ color: '#a1a1aa', fontSize: 11, letterSpacing: '0.08em', fontFamily: '"Space Mono", monospace', marginBottom: 10 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
