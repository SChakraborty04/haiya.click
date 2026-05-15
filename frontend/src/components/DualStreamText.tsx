import { useRef, useEffect } from 'react';
import gsap from 'gsap';

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
  '< REAL-TIME INSIGHTS',
  '< POLL ANALYTICS DASHBOARD',
  '< EXPORT TO CSV / JSON',
  '< CUSTOM STYLING OPTIONS',
  '< EMBEDDABLE WIDGETS',
  '< QR CODE GENERATION',
  '< AUDIT LOG / HISTORY',
  '< IP-BASED VOTE LIMITING',
];

export default function DualStreamText() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

    const leftAnim = gsap.to(leftRef.current, {
      y: '-50%',
      duration: 25,
      repeat: -1,
      ease: 'none',
    });

    const rightAnim = gsap.to(rightRef.current, {
      y: '50%',
      duration: 25,
      repeat: -1,
      ease: 'none',
    });

    return () => {
      leftAnim.kill();
      rightAnim.kill();
    };
  }, []);

  return (
    <div className="relative w-full h-[200px] overflow-hidden border-y border-haiya-hairline">
      {/* Left column - scrolling up */}
      <div className="absolute left-0 top-0 w-1/4 h-full overflow-hidden opacity-30">
        <div ref={leftRef} className="flex flex-col gap-3 py-4">
          {[...STREAM_LINES_LEFT, ...STREAM_LINES_LEFT].map((line, i) => (
            <p key={`l-${i}`} className="text-[10px] text-haiya-muted whitespace-nowrap font-mono px-4">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Right column - scrolling down */}
      <div className="absolute right-0 top-0 w-1/4 h-full overflow-hidden opacity-30">
        <div
          ref={rightRef}
          className="flex flex-col gap-3 py-4"
          style={{ transform: 'translateY(-50%)' }}
        >
          {[...STREAM_LINES_RIGHT, ...STREAM_LINES_RIGHT].map((line, i) => (
            <p key={`r-${i}`} className="text-[10px] text-haiya-muted whitespace-nowrap font-mono px-4">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
