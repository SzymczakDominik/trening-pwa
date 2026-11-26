import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import {
  ArrowLeftRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChartNoAxesColumn, ClipboardList,
  Cloud, Dumbbell,  Ellipsis, Flame, House, Info, List, Minus, Pencil, Play, Plus, Search, Share, SkipForward, Timer, Trash2, Trophy, User, Wrench, X,
  PersonStanding, Activity,
} from 'lucide-react';

const ICONS: Record<string, typeof Check> = {
  home: House, plan: ClipboardList, cal: CalendarDays, chart: ChartNoAxesColumn, more: Ellipsis, back: ChevronLeft, close: X,
  check: Check, plus: Plus, minus: Minus, up: ChevronUp, down: ChevronDown, right: ChevronRight, trash: Trash2, edit: Pencil,
  play: Play, timer: Timer, flame: Flame, trophy: Trophy, user: User, tool: Wrench, cloud: Cloud, swap: ArrowLeftRight, info: Info,
  search: Search, body: PersonStanding, share: Share, dumbbell: Dumbbell, skip: SkipForward, list: List, activity: Activity,
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
          <SheetBody onClose={onClose} title={title}>{children}</SheetBody>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Treść arkusza: zamykana przeciągnięciem w dół (gdy treść jest na samej górze). */
function SheetBody({ onClose, title, children }: { onClose: () => void; title?: string; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const w = wrap.current, sh = sheet.current; if (!w || !sh) return;
    let y0 = 0, armed = false, dragging = false, dy = 0;
    const down = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      armed = sh.scrollTop <= 0 && !t.closest('.draghandle, input, select, textarea');
      dragging = false; dy = 0; y0 = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (document.body.dataset.reorder) { armed = false; dragging = false; return; }
      if (!armed) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 10 && sh.scrollTop <= 0) { dragging = true; w.style.transition = 'none'; }
      if (dragging) {
        if (e.cancelable) e.preventDefault();
        w.style.transform = `translateY(${Math.max(0, dy)}px)`;
      } else if (dy < -10) armed = false;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false; armed = false;
      w.style.transition = 'transform .25s cubic-bezier(.22,.9,.3,1)';
      if (dy > 110) { w.style.transform = 'translateY(100%)'; setTimeout(() => closeRef.current(), 120); }
      else w.style.transform = '';
    };
    w.addEventListener('touchstart', down, { passive: true });
    w.addEventListener('touchmove', move, { passive: false });
    w.addEventListener('touchend', up); w.addEventListener('touchcancel', up);
    return () => { w.removeEventListener('touchstart', down); w.removeEventListener('touchmove', move); w.removeEventListener('touchend', up); w.removeEventListener('touchcancel', up); };
  }, []);
  return (
    <div ref={wrap} className="sheet-wrap" onClick={(e) => e.stopPropagation()}>
      <motion.div ref={sheet} className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 380 }}>
        <div className="grip" />
        {title && <h3>{title}</h3>}
        {children}
      </motion.div>
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


function ReorderRow<T>({ item, className, children }: { item: T; className?: string; children: (handle: ReactNode) => ReactNode }) {
  const controls = useDragControls();
  const ref = useRef<HTMLElement | null>(null);
  const st = useRef<{ t: number; x: number; y: number; active: boolean }>({ t: 0, x: 0, y: 0, active: false });
  // długie przytrzymanie wiersza włącza przeciąganie (zwykły ruch palcem nadal przewija listę)
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('input, select, textarea')) return;
    const s0 = st.current; s0.x = e.clientX; s0.y = e.clientY; s0.active = false;
    const ev = e.nativeEvent;
    window.clearTimeout(s0.t);
    s0.t = window.setTimeout(() => {
      s0.active = true; document.body.dataset.reorder = '1'; controls.start(ev);
      try { navigator.vibrate?.(12); } catch { /* brak */ }
    }, e.pointerType === 'mouse' ? 0 : 280);
  };
  const cancel = () => window.clearTimeout(st.current.t);
  const onPointerMove = (e: React.PointerEvent) => {
    const s0 = st.current;
    if (!s0.active && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 8) cancel();
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const block = (e: TouchEvent) => { if (st.current.active && e.cancelable) e.preventDefault(); };
    const noClick = (e: Event) => { if (st.current.active) { e.stopPropagation(); e.preventDefault(); st.current.active = false; } };
    el.addEventListener('touchmove', block, { passive: false });
    el.addEventListener('click', noClick, true);
    return () => { el.removeEventListener('touchmove', block); el.removeEventListener('click', noClick, true); window.clearTimeout(st.current.t); };
  }, []);
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className={className} ref={ref as never}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { cancel(); window.setTimeout(() => { st.current.active = false; delete document.body.dataset.reorder; }, 50); }} onPointerCancel={() => { cancel(); delete document.body.dataset.reorder; }}
      style={{ position: 'relative', touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as never}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,.45)', zIndex: 5, background: 'var(--surface2)' }}
      transition={{ type: 'spring', damping: 30, stiffness: 500 }}>
      {children(null)}
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
