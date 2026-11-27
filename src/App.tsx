import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
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
import { FoodScreen, FoodSetup } from './screens/Food';
import { FoodAdd, FoodEdit, FoodScan } from './screens/FoodAdd';
import { Account, Install, Method, MoreScreen, Settings, Tools, type SyncInfo } from './screens/More';

const TABS: { t: Tab; icon: string; l: string }[] = [
  { t: 'today', icon: 'home', l: 'Dziś' },
  { t: 'plan', icon: 'plan', l: 'Plan' },
  { t: 'food', icon: 'food', l: 'Żywienie' },
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
    case 'foodAdd': return <FoodAdd date={v.date} meal={v.meal} browse={v.browse} />;
    case 'foodScan': return <FoodScan date={v.date} meal={v.meal} />;
    case 'foodEdit': return <FoodEdit id={v.id} prefill={v.prefill} />;
    case 'foodSetup': return <FoodSetup />;
  }
}

export default function App() {
  const { tab, stack, setTab, push } = useNav();
  const sync = useAuthSync();
  const onboarded = useStore((s) => s.onboarded);
  const hasProgram = useStore((s) => !!s.data.program);
  const hasRest = useStore((s) => !!s.rest);
  const top = stack[stack.length - 1];
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([tab]));
  const scrolls = useRef<Partial<Record<Tab, number>>>({});
  const lastTab = useRef<Tab>(tab);
  const curY = useRef(0);
  useLayoutEffect(() => {
    if (lastTab.current !== tab) { scrolls.current[lastTab.current] = curY.current; lastTab.current = tab; }
    setVisited((v) => (v.has(tab) ? v : new Set(v).add(tab)));
    window.scrollTo(0, scrolls.current[tab] ?? 0);
  }, [tab]);
  useEffect(() => {
    const on = () => { if (!useNav.getState().stack.length) curY.current = window.scrollY; };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (!onboarded && !hasProgram) push({ name: 'onboarding' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      {/* zakładki zostają zamontowane po pierwszym wejściu: bez migotania, bez ponownego ładowania grafik */}
      {TABS.filter((x) => visited.has(x.t)).map((x) => (
        <div key={x.t} className={`tabpane ${tab === x.t ? 'on' : ''}`} style={{ display: tab === x.t ? 'block' : 'none' }}>
          {x.t === 'today' && <Today />}
          {x.t === 'plan' && <PlanScreen />}
          {x.t === 'food' && <FoodScreen />}
          {x.t === 'calendar' && <CalendarScreen />}
          {x.t === 'progress' && <ProgressScreen />}
          {x.t === 'more' && <MoreScreen sync={sync} />}
        </div>
      ))}

      {!top && (
        <LayoutGroup>
          <nav className="tabbar six">
            {TABS.map((x) => (
              <button key={x.t} className={tab === x.t ? 'on' : ''} onClick={() => setTab(x.t)}>
                {tab === x.t && <motion.span layoutId="tabbubble" className="bubble" transition={{ type: 'spring', damping: 28, stiffness: 420 }} />}
                <Icon name={x.icon} size={22} />{x.l}
              </button>
            ))}
          </nav>
        </LayoutGroup>
      )}
      {/* przerwa widoczna także poza ekranem treningu */}
      {top?.name !== 'workout' && hasRest && <RestBar />}

      <AnimatePresence>
        {stack.map((v, i) => (
          <motion.div
            key={`${i}-${v.name}`} className="overlay"
            style={{ display: i === stack.length - 1 ? 'block' : 'none' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.22, 0.9, 0.3, 1], duration: 0.3 }}
          >
            {renderView(v, sync)}
          </motion.div>
        ))}
      </AnimatePresence>
      <Toaster />
    </div>
  );
}
