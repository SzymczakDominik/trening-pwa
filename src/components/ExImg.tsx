import { Dumbbell } from 'lucide-react';
import { IMG_IDS } from '../data/exercises';

const base = import.meta.env.BASE_URL;

type Size = 'sq' | 'sm' | 'hero16' | 'wide' | 'fill';

/** Ilustracja ćwiczenia (2 klatki ruchu) albo zastępczy kafelek dla ćwiczeń własnych. */
export function ExImg({ id, size = 'sq', animate = false, className = '' }: { id: string; size?: Size; animate?: boolean; className?: string }) {
  if (!IMG_IDS.has(id)) {
    return <div className={`ex ph ${size} ${className}`}><Dumbbell size={size === 'sm' ? 20 : size === 'sq' ? 24 : 44} strokeWidth={1.8} /></div>;
  }
  const thumb = size === 'sq' || size === 'sm' || size === 'fill';
  return (
    <div className={`ex ${size} ${animate ? 'anim' : ''} ${className}`}>
      <img className={`f0 ${thumb ? 'crop' : ''}`} src={`${base}img/ex/${id}-0.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
      {animate && <img className="f1" src={`${base}img/ex/${id}-1.webp`} alt="" decoding="async" draggable={false} />}
    </div>
  );
}
