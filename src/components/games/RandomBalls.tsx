import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

type Ball = {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
};

const COLORS = ['#f59e0b', '#10b981', '#f97316', '#14b8a6', '#a78bfa', '#f43f5e', '#22c55e', '#eab308'];

export default function RandomBalls({ options, onDone }: { options: string[]; onDone: (winner: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    let timeout: any;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = 220;
    canvas.width = W;
    canvas.height = H;

    const balls: Ball[] = options.map((name, i) => ({
      name,
      x: 30 + Math.random() * (W - 60),
      y: 30 + Math.random() * (H - 60),
      vx: (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
      vy: (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
      color: COLORS[i % COLORS.length],
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const b of balls) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 20 || b.x > W - 20) b.vx *= -1;
        if (b.y < 20 || b.y > H - 20) b.vy *= -1;

        ctx.beginPath();
        ctx.fillStyle = b.color;
        ctx.arc(b.x, b.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111827';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shortName(b.name), b.x, b.y);
      }
      raf = requestAnimationFrame(draw);
    }

    if (running) {
      draw();
      timeout = setTimeout(() => {
        cancelAnimationFrame(raf);
        const pick = options[Math.floor(Math.random() * options.length)];
        setWinner(pick);
        onDone(pick);
      }, Math.min(6000, 3000 + Math.random() * 2000));
    } else {
      cancelAnimationFrame(raf);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [options, onDone, running]);

  function start() {
    if (!options.length) return;
    setWinner(null);
    setRunning(true);
    setTimeout(() => setRunning(false), 6200);
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="w-full overflow-hidden rounded-md border">
        <canvas ref={canvasRef} className="block h-[220px] w-full" />
      </div>
      <button className="btn btn-primary" disabled={!options.length || running} onClick={start}>
        <Sparkles className="size-4" />
        시작하기
      </button>
      {winner && <div className="text-sm">결과: {winner}</div>}
    </div>
  );
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const n = parts[0];
    return n.length <= 2 ? n : n.slice(-2);
  }
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}
