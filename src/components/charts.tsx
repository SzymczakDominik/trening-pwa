import { useState } from 'react';

export interface Pt { x: number; y: number; label: string }

const W = 340, H = 180, PL = 36, PR = 10, PT = 12, PB = 24;

function niceTicks(min: number, max: number, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min; const step0 = span / n; const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step; const hi = Math.ceil(max / step) * step;
  const ticks: number[] = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

export function LineChart({ points, unit = '', color = 'var(--accent)' }: { points: Pt[]; unit?: string; color?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0) return <div className="empty small">Brak danych w tym okresie</div>;
  const ys = points.map((p) => p.y);
  const { lo, hi, ticks } = niceTicks(Math.min(...ys), Math.max(...ys));
  const x0 = points[0].x, x1 = points[points.length - 1].x;
  const sx = (x: number) => PL + (x1 === x0 ? (W - PL - PR) / 2 : ((x - x0) / (x1 - x0)) * (W - PL - PR));
  const sy = (y: number) => PT + (1 - (y - lo) / (hi - lo || 1)) * (H - PT - PB);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(x1)},${H - PB} L${sx(x0)},${H - PB} Z`;
  const s = sel != null ? points[sel] : points[points.length - 1];
  const si = sel ?? points.length - 1;
  return (
    <div>
      <div className="between small" style={{ minHeight: 22 }}>
        <span className="muted">{s.label}</span>
        <span className="bold num" style={{ color }}>{(Math.round(s.y * 10) / 10).toLocaleString('pl-PL')} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', touchAction: 'pan-y' }}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0; points.forEach((p, i) => { if (Math.abs(sx(p.x) - x) < Math.abs(sx(points[best].x) - x)) best = i; });
          setSel(best);
        }}
        onPointerLeave={() => setSel(null)}>
        <defs>
          <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,.07)" />
            <text x={PL - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="#8b8f9a">{Math.round(t * 10) / 10}</text>
          </g>
        ))}
        {points.length > 1 && <path d={area} fill="url(#lg)" />}
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === si ? 5 : 3} fill={i === si ? color : '#0e0f12'} stroke={color} strokeWidth="2" />)}
        <text x={PL} y={H - 6} fontSize="10" fill="#8b8f9a">{points[0].label}</text>
        {points.length > 1 && <text x={W - PR} y={H - 6} fontSize="10" fill="#8b8f9a" textAnchor="end">{points[points.length - 1].label}</text>}
      </svg>
    </div>
  );
}

export function BarChart({ bars, unit = '', color = 'var(--accent)', height = 150 }: { bars: { label: string; value: number; hi?: boolean }[]; unit?: string; color?: string; height?: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const bw = (W - 8) / bars.length;
  const s = sel != null ? bars[sel] : bars[bars.length - 1];
  return (
    <div>
      <div className="between small" style={{ minHeight: 22 }}>
        <span className="muted">{s?.label}</span>
        <span className="bold num" style={{ color }}>{Math.round(s?.value ?? 0).toLocaleString('pl-PL')} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: 'block' }}>
        {bars.map((b, i) => {
          const h = (b.value / max) * (height - 22);
          const on = sel === i || (sel == null && i === bars.length - 1);
          return (
            <g key={i} onPointerDown={() => setSel(i)}>
              <rect x={4 + i * bw} y={0} width={bw} height={height} fill="transparent" />
              <rect x={4 + i * bw + bw * 0.18} y={height - 18 - h} width={bw * 0.64} height={Math.max(2, h)} rx={4} fill={color} opacity={on ? 1 : b.hi ? 0.7 : 0.35} />
              {(i % Math.ceil(bars.length / 6) === 0 || i === bars.length - 1) && <text x={4 + i * bw + bw / 2} y={height - 4} fontSize="10" fill="#8b8f9a" textAnchor="middle">{b.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
