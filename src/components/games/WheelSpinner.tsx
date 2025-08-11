import { useMemo, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '../ui/button';

export default function WheelSpinner({ options, onDone, isAdmin }: { options: string[]; isAdmin: boolean; onDone: (winner: string) => void }) {
  const count = Math.max(options.length, 1);
  const slice = 360 / count;
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const gradient = useMemo(() => {
    if (count === 1) return 'conic-gradient(#f59e0b 0 360deg)';
    const colors = ['#f59e0b', '#10b981', '#f97316', '#14b8a6', '#a78bfa', '#f43f5e', '#22c55e', '#eab308'];
    const stops: string[] = [];
    for (let i = 0; i < count; i++) {
      const c = colors[i % colors.length];
      const from = i * slice;
      const to = (i + 1) * slice;
      stops.push(`${c} ${from}deg ${to}deg`);
    }
    return `conic-gradient(${stops.join(',')})`;
  }, [count, slice]);

  function spin() {
    if (!options.length) return;
    setSpinning(true);
    const turns = 360 * (3 + Math.floor(Math.random() * 3));
    const offset = Math.floor(Math.random() * 360);
    const nextAngle = angle + turns + offset;
    setAngle(nextAngle);
    setTimeout(() => {
      setSpinning(false);
      const normalized = ((nextAngle % 360) + 360) % 360;
      const indexFromTop = Math.floor((count - normalized / slice) % count);
      const idx = (indexFromTop + count) % count;
      const winner = options[idx];
      onDone(winner);
    }, 2600);
  }

  const labels = options.map((opt, i) => {
    const rot = slice * i + slice / 2;
    return (
      <div key={opt} className="absolute left-1/2 top-1/2 origin-[0_0] -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${rot}deg) translateY(-38%)` }}>
        <div className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow whitespace-nowrap">{opt}</div>
      </div>
    );
  });

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative size-64 sm:size-72">
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full border"
          style={{
            background: gradient,
            transform: `rotate(${angle}deg)`,
            transition: spinning ? 'transform 2.5s cubic-bezier(.21,.8,.33,1)' : undefined,
          }}
        />
        <div className="pointer-events-none absolute inset-0">{labels}</div>
        <div className="absolute left-1/2 top-[-10px] -translate-x-1/2">
          <div className="h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-black" />
        </div>
      </div>
      <Button className="bg-[#838de5] hover:bg-[#6f7dff]" disabled={!isAdmin || !options.length || spinning} onClick={spin}>
        <Shuffle className="size-4" />
        돌리기
      </Button>
    </div>
  );
}
