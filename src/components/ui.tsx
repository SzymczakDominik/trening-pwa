import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls, type DragControls } from 'motion/react';
import {
  ArrowLeftRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChartNoAxesColumn, ClipboardList,
  Cloud, Dumbbell, GripVertical, Ellipsis, Flame, House, Info, List, Minus, Pencil, Play, Plus, Search, Share, SkipForward, Timer, Trash2, Trophy, User, Wrench, X,
  PersonStanding,
} from 'lucide-react';

const ICONS: Record<string, typeof Check> = {
  home: House, plan: ClipboardList, cal: CalendarDays, chart: ChartNoAxesColumn, more: Ellipsis, back: ChevronLeft, close: X,
  check: Check, plus: Plus, minus: Minus, up: ChevronUp, down: ChevronDown, right: ChevronRight, trash: Trash2, edit: Pencil,
  play: Play, timer: Timer, flame: Flame, trophy: Trophy, user: User, tool: Wrench, cloud: Cloud, swap: ArrowLeftRight, info: Info,
  search: Search, body: PersonStanding, share: Share, dumbbell: Dumbbell, skip: SkipForward, list: List, grip: GripVertical,
};

export function Icon({ name, size = 22, stroke = 2, fill }: { name: string; size?: number; stroke?: number; fill?: boolean }) {
  const C = ICONS[name] ?? Info;
  return <C size={size} strokeWidth={stroke} fill={fill ? 'currentColor' : 'none'} aria-hidden />;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-bg" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <motion.div className="sheet" onClick={(e) => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 380 }}>
            <div className="grip" />
            {title && <h3>{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const id = useId();
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.v === value && <motion.span layoutId={id} className="pill" style={{ left: 0, right: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 420 }} />}
          <span style={{ position: 'relative', zIndex: 1 }}>{o.l}</span>
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, suffix }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="iconbtn" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Icon name="minus" size={18} /></button>
      <div className="num bold" style={{ minWidth: 56, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 18 }}>{value}{suffix}</div>
      <button className="iconbtn" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}><Icon name="plus" size={18} /></button>
    </div>
  );
}

/** Pole liczbowe przyjazne dla iOS (przecinek → kropka, klawiatura dziesiętna). Zawsze wyśrodkowane. */
export function NumInput({ value, onChange, className = 'input', placeholder, decimal = true }: { value: number | undefined; onChange: (n: number) => void; className?: string; placeholder?: string; decimal?: boolean }) {
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
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }} />
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
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
      <AnimatePresence>
        {m && (
          <motion.div key={m} className="toast" style={{ position: 'static', marginBottom: 'calc(var(--safe-bottom) + 92px)' }}
            initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', damping: 26, stiffness: 380 }}>
            {m}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Płynnie animowana liczba. */
export function CountUp({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const from = 0; const t0 = performance.now(); const dur = 700;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setV(from + (value - from) * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(v)}</>;
}

export const kgFmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pl-PL');
export const bigFmt = (n: number) => n >= 10000 ? `${(n / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} t` : `${Math.round(n).toLocaleString('pl-PL')} kg`;


/** Uchwyt do przeciągania wiersza (dotknij i przytrzymaj, potem przesuń). */
export function DragHandle({ controls }: { controls: DragControls }) {
  return (
    <span className="draghandle" aria-label="Przeciągnij, aby zmienić kolejność" role="button"
      onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}>
      <Icon name="grip" size={22} />
    </span>
  );
}

function ReorderRow<T>({ item, className, children }: { item: T; className?: string; children: (handle: ReactNode) => ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className={className}
      style={{ position: 'relative' }} whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,.45)', zIndex: 5, background: 'var(--surface2)' }}
      transition={{ type: 'spring', damping: 30, stiffness: 500 }}>
      {children(<DragHandle controls={controls} />)}
    </Reorder.Item>
  );
}

/** Lista z możliwością zmiany kolejności przez przeciąganie uchwytu. */
export function ReorderList<T>({ items, getKey, onReorder, rowClass, children }: {
  items: T[]; getKey: (x: T) => string; onReorder: (next: T[]) => void; rowClass?: (x: T) => string;
  children: (item: T, index: number, handle: ReactNode) => ReactNode;
}) {
  return (
    <Reorder.Group axis="y" values={items} onReorder={onReorder} as="div" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((it, i) => (
        <ReorderRow key={getKey(it)} item={it} className={rowClass?.(it)}>{(h) => children(it, i, h)}</ReorderRow>
      ))}
    </Reorder.Group>
  );
}
