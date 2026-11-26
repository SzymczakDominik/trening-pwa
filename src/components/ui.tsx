import { useEffect, useState, type ReactNode } from 'react';

const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  plan: 'M4 5h16M4 12h16M4 19h10',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  right: 'M9 5l7 7-7 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  play: 'M7 4v16l13-8z',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-8-5-13-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 9 0 4 3 7 7 7z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  tool: 'M14 7a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2zM4 4l4 4',
  cloud: 'M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  body: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 9h14M12 9v6M9 22l3-7 3 7',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  dumbbell: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  skip: 'M5 5v14l10-7zM19 5v14',
};

export function Icon({ name, size = 22, stroke = 2, fill }: { name: keyof typeof P | string; size?: number; stroke?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? ''} />
    </svg>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      {onBack && <button className="iconbtn" onClick={onBack} aria-label="Wstecz"><Icon name="back" /></button>}
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, suffix }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <button className="iconbtn" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Icon name="minus" size={18} /></button>
      <div className="num bold" style={{ minWidth: 54, textAlign: 'center' }}>{value}{suffix}</div>
      <button className="iconbtn" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}><Icon name="plus" size={18} /></button>
    </div>
  );
}

/** Pole liczbowe przyjazne dla iOS (przecinek → kropka, klawiatura dziesiętna). */
export function NumInput({ value, onChange, className = 'setin', placeholder, decimal = true }: { value: number | undefined; onChange: (n: number) => void; className?: string; placeholder?: string; decimal?: boolean }) {
  const [txt, setTxt] = useState(value ? String(value) : '');
  useEffect(() => { if (Number(txt.replace(',', '.')) !== value) setTxt(value ? String(value) : ''); /* eslint-disable-next-line */ }, [value]);
  return (
    <input
      className={className} inputMode={decimal ? 'decimal' : 'numeric'} placeholder={placeholder ?? '0'} value={txt}
      onFocus={(e) => e.target.select()}
      onChange={(e) => { const t = e.target.value.replace(/[^0-9.,]/g, ''); setTxt(t); const n = Number(t.replace(',', '.')); if (!Number.isNaN(n)) onChange(n); }}
    />
  );
}

export function Ring({ value, size = 64, stroke = 7, color = 'var(--accent)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.1)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset .3s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

let toastSet: ((s: string | null) => void) | null = null;
export function toast(msg: string) { toastSet?.(msg); }
export function Toaster() {
  const [m, setM] = useState<string | null>(null);
  useEffect(() => { toastSet = setM; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!m) return; const t = setTimeout(() => setM(null), 2400); return () => clearTimeout(t); }, [m]);
  return m ? <div className="toast">{m}</div> : null;
}

export const kgFmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pl-PL');
export const bigFmt = (n: number) => n >= 10000 ? `${(n / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} t` : `${Math.round(n).toLocaleString('pl-PL')} kg`;
