import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

function useTypewriter(words: string[], typeSpeed = 80, backSpeed = 50, backDelay = 1500) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
      if (text === '') {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        timeout = setTimeout(() => {}, 50);
      } else {
        timeout = setTimeout(() => {
          setText(text.slice(0, -1));
        }, backSpeed);
      }
    } else {
      if (text === currentWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, backDelay);
      } else {
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length + 1));
        }, typeSpeed);
      }
    }
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typeSpeed, backSpeed, backDelay]);

  return text;
}

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

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const typedText = useTypewriter(["hai.", "iya.", "decide.", "tally.", "click."]);
  const navigate = useNavigate();

  const [isDodging, setIsDodging] = useState(false);
  const [noPos, setNoPos] = useState({ x: 0, y: 0 });
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current && glowRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
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

  const handleNoHover = (mouseX: number, mouseY: number) => {
    if (hasVoted || !panelRef.current) return;
    setIsDodging(true);
    
    const panel = panelRef.current;
    const btnWidth = 100;
    const btnHeight = 45;
    
    const maxX = panel.clientWidth - btnWidth - 48; // accounting for padding
    const maxY = panel.clientHeight - btnHeight - 40;
    
    const rect = panel.getBoundingClientRect();
    let randomX = 0;
    let randomY = 0;
    let safe = false;
    let attempts = 0;
    
    while (!safe && attempts < 50) {
      randomX = Math.max(20, Math.floor(Math.random() * maxX));
      randomY = Math.max(20, Math.floor(Math.random() * maxY));
      
      const absoluteBtnX = rect.left + randomX + btnWidth / 2;
      const absoluteBtnY = rect.top + randomY + btnHeight / 2;
      
      const dx = absoluteBtnX - mouseX;
      const dy = absoluteBtnY - mouseY;
      
      // Ensure the new center is at least 120px away from the cursor
      if (dx * dx + dy * dy > 14400) {
        safe = true;
      }
      attempts++;
    }
    
    setNoPos({ x: randomX, y: randomY });
  };

  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.style.minHeight = '100vh';
    }
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#0a0a0a',
        paddingTop: 80,
      }}
    >


      <AnimatedAsciiBarChart panelRef={panelRef} />

      {/* Main panel - Two columns */}
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          padding: '40px 48px',
          border: '1px solid #27272a',
          background: 'rgba(10, 10, 10, 0.9)',
          zIndex: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 48,
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 900,
          width: '90%',
          overflow: 'hidden',
        }}
      >
        {/* Glowing light effect */}
        <div 
          ref={glowRef}
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.39) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            top: 0,
            left: 0,
            zIndex: 0,
          }} 
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 48, width: '100%' }}>
          {/* Left Column: Typewriter */}
          <div style={{ flex: '1 1 300px', textAlign: 'left' }}>
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              letterSpacing: '-0.02em',
              color: '#f5f5f5',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Stop the overthinking.<br />
            Just <span style={{ color: '#BC002D' }}>{typedText}</span>
            <span style={{ animation: 'cursorBlink 0.5s step-start infinite', color: '#BC002D' }}>█</span>
          </h1>
        </div>

        {/* Right Column: Poll Interaction */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p
            style={{
              fontSize: '15px',
              color: '#a1a1aa',
              fontFamily: '"Space Mono", monospace',
              letterSpacing: '0.05em',
              margin: 0,
              textAlign: 'left'
            }}
          >
            Are you ready to try haiya.click?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setHasVoted(true)}
              disabled={hasVoted}
              style={{
                flex: 1,
                padding: '12px 24px',
                border: '1px solid #27272a',
                background: hasVoted ? '#27272a' : 'transparent',
                color: hasVoted ? '#52525b' : '#f5f5f5',
                fontSize: 14,
                letterSpacing: '0.1em',
                cursor: hasVoted ? 'default' : 'pointer',
                fontFamily: '"Space Mono", monospace',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (!hasVoted) e.currentTarget.style.borderColor = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#27272a'; }}
            >
              [ YES ]
            </button>
            {(isDodging && !hasVoted) && <div style={{ flex: 1 }} />}
            <button
              disabled={hasVoted}
              style={{
                flex: (isDodging && !hasVoted) ? 'none' : 1,
                position: (isDodging && !hasVoted) ? 'absolute' : 'relative',
                left: (isDodging && !hasVoted) ? noPos.x : 'auto',
                top: (isDodging && !hasVoted) ? noPos.y : 'auto',
                padding: '12px 24px',
                border: '1px solid #27272a',
                background: hasVoted ? '#27272a' : ((isDodging && !hasVoted) ? 'rgba(10, 10, 10, 0.95)' : 'transparent'),
                color: hasVoted ? '#52525b' : '#f5f5f5',
                fontSize: 14,
                letterSpacing: '0.1em',
                cursor: hasVoted ? 'default' : 'pointer',
                fontFamily: '"Space Mono", monospace',
                transition: 'all 0.2s',
                zIndex: 10,
              }}
              onMouseEnter={(e) => { 
                if (hasVoted) return;
                e.currentTarget.style.borderColor = '#f5f5f5'; 
                handleNoHover(e.clientX, e.clientY);
              }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#27272a'; }}
            >
              [ NO ]
            </button>
          </div>

          {/* Result Area */}
          {hasVoted && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.5s ease-out forwards' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f5f5f5', fontFamily: '"Space Mono", monospace' }}>
                  <span>[ YES ]</span>
                  <span>100%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: '#27272a', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: '#BC002D' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a1a1aa', fontFamily: '"Space Mono", monospace' }}>
                  <span>[ NO ]</span>
                  <span>0%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: '#27272a', overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', background: '#a1a1aa' }} />
                </div>
              </div>
              
              <div style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 11, fontFamily: '"Space Mono", monospace', letterSpacing: '0.05em' }}>
                Believe me you won't regret it.
              </div>

              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '12px 24px',
                  background: '#f5f5f5',
                  color: '#0a0a0a',
                  border: 'none',
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontFamily: '"Space Mono", monospace',
                  fontWeight: 'bold',
                  transition: 'opacity 0.2s',
                  marginTop: 4
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                GET STARTED →
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.3em',
            color: '#a1a1aa',
            fontFamily: '"Space Mono", monospace',
          }}
        >
          SCROLL
        </span>
        <div style={{ width: 1, height: 32, background: '#27272a', position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              width: '100%',
              height: 12,
              background: '#ff1a1a',
              position: 'absolute',
              animation: 'scrollPulse 1.5s ease-in-out infinite',
            }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes scrollPulse {
          0% { top: -12px; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 40px; opacity: 0; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
