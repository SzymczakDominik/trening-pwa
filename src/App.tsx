import { useEffect } from 'react';
import { useNav, type Tab, type View } from './nav';
import { useStore } from './lib/store';
import { useAuthSync } from './lib/sync';
import { Icon, Toaster } from './components/ui';
import { Today } from './screens/Today';
import { PlanScreen } from './screens/Plan';
import { Library, Onboarding, PlanDetail } from './screens/Library';
import { WorkoutEditor } from './screens/Editor';
import { RestBar, Workout } from './screens/Workout';
import { CalendarScreen } from './screens/Calendar';
import { ExerciseDetail, ProgressScreen, SessionDetail } from './screens/Progress';
import { Account, Install, Method, MoreScreen, Settings, Tools, type SyncInfo } from './screens/More';

const TABS: { t: Tab; icon: string; l: string }[] = [
  { t: 'today', icon: 'home', l: 'Dziś' },
  { t: 'plan', icon: 'plan', l: 'Plan' },
  { t: 'calendar', icon: 'cal', l: 'Kalendarz' },
  { t: 'progress', icon: 'chart', l: 'Postępy' },
  { t: 'more', icon: 'more', l: 'Więcej' },
];

function renderView(v: View, sync: SyncInfo) {
  switch (v.name) {
    case 'library': return <Library />;
    case 'planDetail': return <PlanDetail id={v.id} />;
    case 'editWorkout': return <WorkoutEditor blockIndex={v.blockIndex} workoutId={v.workoutId} />;
    case 'workout': return <Workout />;
    case 'exercise': return <ExerciseDetail id={v.id} />;
    case 'session': return <SessionDetail id={v.id} />;
    case 'tools': return <Tools />;
    case 'account': return <Account sync={sync} />;
    case 'settings': return <Settings />;
    case 'method': return <Method />;
    case 'install': return <Install />;
    case 'onboarding': return <Onboarding />;
  }
}

export default function App() {
  const { tab, stack, setTab, push } = useNav();
  const sync = useAuthSync();
  const onboarded = useStore((s) => s.onboarded);
  const hasProgram = useStore((s) => !!s.data.program);
  const hasActive = useStore((s) => !!s.active);
  const top = stack[stack.length - 1];

  useEffect(() => {
    if (!onboarded && !hasProgram) push({ name: 'onboarding' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // przycisk „wstecz” (gest w PWA / Android) zamyka nakładkę
  useEffect(() => {
    const onPop = () => { if (useNav.getState().stack.length) useNav.getState().pop(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="app">
      {tab === 'today' && <Today />}
      {tab === 'plan' && <PlanScreen />}
      {tab === 'calendar' && <CalendarScreen />}
      {tab === 'progress' && <ProgressScreen />}
      {tab === 'more' && <MoreScreen sync={sync} />}

      {!top && (
        <nav className="tabbar">
          {TABS.map((x) => (
            <button key={x.t} className={tab === x.t ? 'on' : ''} onClick={() => setTab(x.t)}>
              <Icon name={x.icon} size={22} />{x.l}
            </button>
          ))}
        </nav>
      )}
      {/* przerwa widoczna także poza ekranem treningu */}
      {!top && hasActive && <RestBarWrap />}

      {stack.map((v, i) => (
        <div key={i} className="overlay" style={{ display: i === stack.length - 1 ? 'block' : 'none' }}>{renderView(v, sync)}</div>
      ))}
      <Toaster />
    </div>
  );
}

function RestBarWrap() {
  const rest = useStore((s) => s.rest);
  return rest ? <RestBar aboveTabs /> : null;
}
