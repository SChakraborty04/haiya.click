export default function Footer() {
  const waveformChars = [
    '▁','▂','▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃','▂','▁','▂',
    '▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃','▂','▁','▂','▃','▄',
    '▅','▆','▇','█','▇','▆','▅','▄','▃','▂','▁','▂','▃','▄','▅','▆',
  ];

  return (
    <footer id="footer" style={{ borderTop: '1px solid #27272a', marginTop: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Left section: vertical text + tagline */}
        <div style={{ padding: 32, borderRight: '1px solid #27272a', display: 'flex', gap: 48, alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: '0.5em',
              color: '#dc2626',
              fontFamily: '"Space Mono", monospace',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            REAL-TIME_INSIGHTS.<br/>
            PROTECTED_POLLS.<br/>
            PUBLIC_POLLS.<br/>
            TIME_BOUND.
          </span>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', color: '#a1a1aa', textAlign: 'left', fontFamily: '"Space Mono", monospace', margin: 0 }}>
            Real-time insights.<br />Always.
          </p>
        </div>

        {/* Center: slider + waveform */}
        <div style={{ padding: 32, borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ width: '100%', position: 'relative' }}>
            <div style={{ height: 1, background: '#27272a', width: '100%' }}></div>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '60%', width: 12, height: 12, borderRadius: '50%', border: '1px solid #ff1a1a', background: '#0a0a0a' }}></div>
          </div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', color: '#a1a1aa', textAlign: 'center' }}>
            View final results at the same link.
          </p>
          <div style={{ display: 'flex', gap: 0, opacity: 0.4 }}>
            {waveformChars.map((char, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  fontFamily: '"Space Mono", monospace',
                  color: '#a1a1aa',
                  lineHeight: 1,
                  animation: `waveformPulse 1.2s ease-in-out ${i * 0.04}s infinite`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Right: links */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {['About Us', 'Contact', 'Privacy Policy', 'Terms of Service'].map((link) => (
            <a 
              key={link} 
              href="#" 
              style={{ 
                fontSize: 11, 
                letterSpacing: '0.15em', 
                color: '#a1a1aa', 
                textDecoration: 'none', 
                fontFamily: '"Space Mono", monospace',
                transition: 'color 0.2s'
              }} 
              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'} 
              onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
            >
              {link.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: '#27272a', width: '100%' }}></div>
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#a1a1aa' }}>HAIYA.CLICK — 2026 | MADE WITH ❤️ BY SANDIPAN CHAKRABORTY</p>
      </div>

      <style>{`
        @keyframes waveformPulse {
          0%, 100% { opacity: 0.3; transform: scaleY(0.8); }
          50% { opacity: 1; transform: scaleY(1.2); }
        }
      `}</style>
    </footer>
  );
}
