import { useRef, useEffect } from 'react';

const CHARS = ['·', '-', '~', ':', '=', '+', '*', '#', '%', '@', 'M', 'W', '█'];

function getChar(brightness: number): string {
  const idx = Math.min(CHARS.length - 1, Math.max(0, Math.floor(brightness * CHARS.length)));
  return CHARS[idx];
}

// Hand polygons (normalized coords)
const LEFT_HAND = [
  [0.05, 0.60], [0.10, 0.55], [0.18, 0.52], [0.28, 0.50],
  [0.35, 0.48], [0.40, 0.45], [0.43, 0.42], [0.44, 0.38],
  [0.43, 0.34], [0.41, 0.30], [0.38, 0.27], [0.34, 0.26],
  [0.30, 0.28], [0.27, 0.31], [0.25, 0.34], [0.22, 0.33],
  [0.18, 0.34], [0.15, 0.37], [0.12, 0.42], [0.06, 0.50],
];

const RIGHT_HAND = [
  [0.95, 0.60], [0.90, 0.55], [0.82, 0.52], [0.72, 0.50],
  [0.65, 0.48], [0.60, 0.45], [0.57, 0.42], [0.56, 0.38],
  [0.57, 0.34], [0.59, 0.30], [0.62, 0.27], [0.66, 0.26],
  [0.70, 0.28], [0.73, 0.31], [0.75, 0.34], [0.78, 0.33],
  [0.82, 0.34], [0.85, 0.37], [0.88, 0.42], [0.94, 0.50],
];

function pointInPolygon(x: number, y: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export default function ASCIICanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1, y: -1, active: false });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CELL = 12;
    let W = 0, H = 0, cols = 0, rows = 0;
    let gridA: Float32Array;
    let gridB: Float32Array;
    let time = 0;
    let running = true;

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      if (W === 0 || H === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);
      gridA = new Float32Array(cols * rows);
      gridB = new Float32Array(cols * rows);

      // Seed hand regions with visible brightness
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = (c * CELL) / W;
          const ny = (r * CELL) / H;
          if (pointInPolygon(nx, ny, LEFT_HAND) || pointInPolygon(nx, ny, RIGHT_HAND)) {
            const idx = r * cols + c;
            gridA[idx] = 0.4 + Math.random() * 0.3;
            gridB[idx] = gridA[idx];
          }
        }
      }
    }

    function inject(cx: number, cy: number, strength: number) {
      const cc = Math.floor(cx / CELL);
      const rr = Math.floor(cy / CELL);
      const R = 5;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const c = cc + dx, r = rr + dy;
          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            const d = Math.sqrt(dx * dx + dy * dy);
            const f = Math.max(0, 1 - d / (R + 1));
            gridB[r * cols + c] = Math.min(1.5, gridB[r * cols + c] + strength * f * f);
          }
        }
      }
    }

    function loop() {
      if (!running) return;
      time += 0.016;

      if (W === 0 || H === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      ctx!.clearRect(0, 0, W, H);
      ctx!.font = `${CELL - 1}px "Space Mono", "Courier New", monospace`;
      ctx!.textBaseline = 'top';

      // Diffusion
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const idx = r * cols + c;
          const avg = (gridA[idx] + gridA[idx - 1] + gridA[idx + 1] + gridA[idx - cols] + gridA[idx + cols]) * 0.2;
          gridB[idx] = Math.max(0, avg - 0.005);
        }
      }

      // Swap
      const tmp = gridA; gridA = gridB; gridB = tmp;

      // Mouse
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x, my = mouseRef.current.y;
        inject(mx, my, 0.8);
        inject(mx + CELL * 2, my, 0.3);
        inject(mx - CELL * 2, my, 0.3);
        inject(mx, my + CELL * 2, 0.3);
        inject(mx, my - CELL * 2, 0.3);
      }

      // Auto ambient pulses at hand centers
      if (Math.floor(time * 60) % 90 === 0) {
        inject(W * 0.25, H * 0.42, 0.2);
        inject(W * 0.75, H * 0.42, 0.2);
      }

      // Render grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const px = c * CELL;
          const py = r * CELL;
          const nx = px / W;
          const ny = py / H;
          const inHand = pointInPolygon(nx, ny, LEFT_HAND) || pointInPolygon(nx, ny, RIGHT_HAND);
          let brightness = gridA[idx];
          const noise = Math.sin(c * 0.12 + time * 0.8) * Math.cos(r * 0.12 + time * 0.5) * 0.5 + 0.5;

          if (inHand) {
            const shimmer = Math.sin(c * 0.4 + r * 0.3 + time * 3) * 0.2 + 0.6;
            brightness = Math.max(brightness, 0.2 + noise * 0.1 + shimmer * 0.08);
            const alpha = Math.min(1, brightness * 1.5 + 0.3);
            ctx!.fillStyle = `rgba(220, 38, 38, ${alpha})`;
            ctx!.fillText(getChar(brightness), px, py);
          } else if (brightness > 0.02) {
            ctx!.fillStyle = `rgba(245, 245, 245, ${brightness * 0.25})`;
            ctx!.fillText(getChar(brightness * 0.5), px, py);
          }
        }
      }

      // Draw labels
      ctx!.font = 'bold 12px "Space Mono", "Courier New", monospace';
      ctx!.textBaseline = 'middle';
      ctx!.textAlign = 'center';

      ctx!.fillStyle = `rgba(220, 38, 38, ${0.8 + Math.sin(time * 2.5) * 0.2})`;
      ctx!.fillText('HAI', W * 0.30, H * 0.25);

      ctx!.fillStyle = `rgba(220, 38, 38, ${0.8 + Math.sin(time * 2.5 + 1.5) * 0.2})`;
      ctx!.fillText('IYA', W * 0.70, H * 0.25);

      // Connection line
      ctx!.strokeStyle = `rgba(220, 38, 38, ${0.1 + Math.sin(time * 1.5) * 0.05})`;
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.moveTo(W * 0.30, H * 0.29);
      ctx!.lineTo(W * 0.70, H * 0.29);
      ctx!.stroke();

      // Floating particles
      ctx!.font = '9px "Space Mono", "Courier New", monospace';
      for (let i = 0; i < 5; i++) {
        const px = W * 0.5 + (i - 2) * 30;
        const py = H * 0.33 + Math.sin(time * 2 + i * 0.8) * 8;
        const fade = 0.12 + Math.sin(time * 3 + i) * 0.06;
        ctx!.fillStyle = `rgba(220, 38, 38, ${Math.max(0, fade)})`;
        ctx!.fillText(i % 2 === 0 ? 'HAI' : 'IYA', px, py);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // Events
    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => { mouseRef.current.active = false; };
    const onTouch = (e: TouchEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top, active: true };
    };
    const onResize = () => resize();

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('resize', onResize);

    // Init
    resize();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove', onTouch);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ zIndex: 0, opacity: 0.92 }}
    />
  );
}
