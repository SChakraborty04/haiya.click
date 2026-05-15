import { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav links on dashboard and poll view pages
  const isAppPage = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/p/');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (headerRef.current && glowRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom && e.clientX >= rect.left && e.clientX <= rect.right) {
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

  // Close menu when route changes
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 50,
          background: 'rgba(10, 10, 10, 0.95)',
          borderBottom: '1px solid #27272a',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Glowing light effect */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute',
            width: 80, height: 80,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.39) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            top: 0, left: 0, zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
          {/* Left — hamburger (mobile-only) + nav (desktop + home page only) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 80 }}>
            {/* Hamburger — only on mobile AND only on home page */}
            {!isAppPage && (
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
                style={{
                  width: 36, height: 36,
                  border: '1px solid #27272a',
                  background: 'transparent',
                  color: '#f5f5f5',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className="hamburger-btn"
              >
                {menuOpen ? '✕' : '≡'}
              </button>
            )}

            {/* Desktop nav — only on home page */}
            {!isAppPage && (
              <nav className="desktop-nav" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <NavLink onClick={() => scrollTo('hero')}>HOME</NavLink>
                <NavLink onClick={() => scrollTo('features')}>FEATURES</NavLink>
                <NavLink onClick={() => scrollTo('footer')}>CONTACT</NavLink>
              </nav>
            )}
          </div>

          {/* Center logo */}
          <div
            style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <span style={{ fontSize: 15, letterSpacing: '0.25em', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', whiteSpace: 'nowrap' }}>
              HAIYA<span style={{ color: '#ff1a1a' }}>.</span>CLICK
            </span>
          </div>

          {/* Right — Start Now (home only) or slim POLLS label on app pages */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 80, justifyContent: 'flex-end' }}>
            {!isAppPage ? (
              <button
                onClick={() => navigate('/register')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 16px',
                  border: '1px solid #f5f5f5',
                  borderRadius: 50,
                  background: 'transparent',
                  color: '#f5f5f5',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  fontFamily: '"Space Mono", monospace',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#0a0a0a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f5f5f5'; }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff1a1a', display: 'inline-block' }} />
                START NOW →
              </button>
            ) : (
              <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#a1a1aa', fontFamily: '"Space Mono", monospace' }}>
                POLLS
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu — home page only */}
      {!isAppPage && menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 57,
            left: 0,
            right: 0,
            zIndex: 49,
            background: 'rgba(10,10,10,0.98)',
            borderBottom: '1px solid #27272a',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          {[['HOME', 'hero'], ['FEATURES', 'features'], ['CONTACT', 'footer']].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: 12,
                letterSpacing: '0.15em',
                cursor: 'pointer',
                fontFamily: '"Space Mono", monospace',
                padding: '14px 24px',
                textAlign: 'left',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
            >
              {label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #27272a', margin: '8px 0' }} />
          <button
            onClick={() => { setMenuOpen(false); navigate('/register'); }}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              letterSpacing: '0.15em',
              cursor: 'pointer',
              fontFamily: '"Space Mono", monospace',
              padding: '14px 24px',
              textAlign: 'left',
              margin: '4px 16px',
            }}
          >
            START NOW →
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Hide hamburger on desktop */
        @media (min-width: 640px) {
          .hamburger-btn { display: none !important; }
        }
        /* Show desktop nav only on desktop */
        .desktop-nav { display: none !important; }
        @media (min-width: 640px) {
          .desktop-nav { display: flex !important; }
        }
      `}</style>
    </>
  );
}

function NavLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#a1a1aa',
        fontSize: 12,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        fontFamily: '"Space Mono", monospace',
        padding: 0,
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
      onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
    >
      {children}
    </button>
  );
}
