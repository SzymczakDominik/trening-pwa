import { useState } from 'react';
import { useStore, liveSessions } from '../lib/store';
import { useNav } from '../nav';
import { addDays, DAY_SHORT, fmtDate, fmtShort, fromStr, MONTHS, mondayOf, pad, programPosition, sessionVolume, todayStr, uid, weekday } from '../lib/calc';
import { Icon, bigFmt, toast } from '../components/ui';

export function CalendarScreen() {
  const data = useStore((s) => s.data);
  const { push } = useNav();
  const today = todayStr();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const p = data.program;
  const sessions = liveSessions(data);
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  const first = `${month}-01`;
  const gridStart = mondayOf(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const [y, m] = month.split('-').map(Number);
  const shift = (d: number) => { const dt = new Date(y, m - 1 + d, 1); setMonth(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`); };

  const info = (d: string) => {
    if (!p || d < p.startDate) return { plan: false, deload: false, bstart: false };
    const pos = programPosition(p, d);
    return { plan: p.trainingDays.includes(weekday(d)) && d >= (p.createdOn ?? p.startDate), deload: pos.deload, bstart: pos.blockStart === d && weekday(d) === 0 };
  };

  const selSessions = byDate.get(sel) ?? [];
  const selInfo = info(sel);
  const selPos = p && sel >= p.startDate ? programPosition(p, sel) : undefined;

  // oś czasu bloków (bieżący i 2 kolejne)
  const timeline = p ? (() => {
    const out: { name: string; from: string; to: string; now: boolean }[] = [];
    let d = programPosition(p).blockStart;
    for (let i = 0; i < 3; i++) {
      const pos = programPosition(p, d);
      out.push({ name: pos.block.name, from: pos.blockStart, to: pos.blockEnd, now: i === 0 });
      d = addDays(pos.blockEnd, 1);
    }
    return out;
  })() : [];

  const markDone = () => {
    const now = Date.now();
    useStore.setState((s) => {
      const d = JSON.parse(JSON.stringify(s.data));
      d.sessions.push({ id: uid(), date: sel, programId: p?.id, workoutName: 'Trening (oznaczony ręcznie)', startedAt: fromStr(sel).getTime() + 12 * 3600e3, finishedAt: now, entries: [], updatedAt: now });
      d.updatedAt = now; return { data: d };
    });
    toast('Dzień oznaczony jako treningowy ✓');
  };

  return (
    <div className="screen">
      <h1 className="title">Kalendarz</h1>
      <div className="card mt12">
        <div className="between">
          <button className="iconbtn" onClick={() => shift(-1)}><Icon name="back" /></button>
          <div className="bold" style={{ textTransform: 'capitalize' }}>{MONTHS[m - 1]} {y}</div>
          <button className="iconbtn" onClick={() => shift(1)}><Icon name="right" /></button>
        </div>
        <div className="cal mt12">
          {DAY_SHORT.map((d) => <div key={d} className="h">{d}</div>)}
          {days.map((d) => {
            const i = info(d); const done = byDate.has(d);
            const cls = ['c', d.slice(0, 7) !== month && 'out', d === today && 'today', done && 'done', !done && i.plan && (d < today ? 'miss' : 'plan'), i.deload && 'deload', i.bstart && 'bstart', d === sel && 'sel'].filter(Boolean).join(' ');
            return <button key={d} className={cls} onClick={() => setSel(d)}>{fromStr(d).getDate()}</button>;
          })}
        </div>
        <div className="legend mt12">
          <span><i style={{ background: 'var(--accent)' }} />zrobiony</span>
          <span><i style={{ background: 'var(--muted)', borderRadius: 5 }} />zaplanowany</span>
          <span><i style={{ background: 'var(--danger)', borderRadius: 5 }} />opuszczony</span>
          <span><i style={{ background: 'rgba(155,135,255,.4)' }} />odciążenie</span>
          <span><i style={{ background: 'var(--violet)' }} />start bloku</span>
        </div>
      </div>

      <div className="section-h"><h2>{fmtDate(sel)}</h2>{selPos && <span className="small muted">{selPos.block.name} · tydz. {selPos.weekInBlock}</span>}</div>
      {selSessions.map((s) => (
        <button key={s.id} className="list-btn" onClick={() => push({ name: 'session', id: s.id })}>
          <div className="badge" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}><Icon name="check" size={16} stroke={3} /></div>
          <div className="grow"><div className="bold">{s.workoutName}</div><div className="xs muted">{s.entries.length} ćwiczeń · {bigFmt(sessionVolume(s))}</div></div>
          <Icon name="right" />
        </button>
      ))}
      {!selSessions.length && (
        <div className="card small muted">
          {selInfo.plan ? (sel < today ? 'Zaplanowany dzień treningowy – brak zapisanego treningu.' : 'Zaplanowany dzień treningowy.') : 'Dzień bez treningu.'}
          {sel <= today && <button className="btn sm mt12" style={{ display: 'flex' }} onClick={markDone}><Icon name="check" size={16} /> Oznacz jako zrobiony</button>}
        </div>
      )}

      {p && (
        <>
          <div className="section-h"><h2>Harmonogram bloków</h2></div>
          <div className="card">
            {timeline.map((t, i) => (
              <div key={i} className="exrow">
                <div className="badge" style={t.now ? { background: 'var(--violet)', color: '#120d2b' } : undefined}>{i + 1}</div>
                <div className="grow"><div className="bold">{t.name}{t.now ? ' · teraz' : ''}</div><div className="xs muted">{fmtShort(t.from)} – {fmtDate(t.to)}</div></div>
              </div>
            ))}
            <p className="xs muted mt8">Blok zmienia się automatycznie w poniedziałek po zakończeniu poprzedniego. Po ostatnim bloku program startuje od nowa (kolejny cykl) z wyższymi ciężarami.</p>
          </div>
        </>
      )}
    </div>
  );
}
