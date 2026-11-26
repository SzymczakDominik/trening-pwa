import { useEffect } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useNav, type Tab, type View } from './nav';
import { useStore } from './lib/store';
import { useAuthSync } from './lib/sync';
import { Icon, Toaster, toast } from './components/ui';
import { Today } from './screens/Today';
import { PlanScreen } from './screens/Plan';
import { Library, Onboarding, PlanDetail } from './screens/Library';
import { WorkoutEditor } from './screens/Editor';
import { RestBar, Workout } from './screens/Workout';
import { CalendarScreen } from './screens/Calendar';
import { ExerciseDetail, ProgressScreen, SessionDetail } from './screens/Progress';
import { Account, Install, Method, MoreScreen, Settings, Tools, type SyncInfo } from './screens/More';
import { StravaScreen } from './screens/Strava';
import { finishStravaRedirect } from './lib/strava';

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
    case 'strava': return <StravaScreen sync={sync} />;
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
  const hasRest = useStore((s) => !!s.rest);
  const top = stack[stack.length - 1];

  useEffect(() => {
    if (!onboarded && !hasProgram) push({ name: 'onboarding' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // powrót ze strony zgody Stravy (?code=…)
  const userId = sync.auth?.user?.id;
  useEffect(() => {
    if (!userId) return;
    finishStravaRedirect().then((r) => {
      if (!r) return;
      toast(r.msg);
      if (r.ok) { useNav.getState().setTab('more'); push({ name: 'strava' }); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          {tab === 'today' && <Today />}
          {tab === 'plan' && <PlanScreen />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'progress' && <ProgressScreen />}
          {tab === 'more' && <MoreScreen sync={sync} />}
        </motion.div>
      </AnimatePresence>

      {!top && (
        <LayoutGroup>
          <nav className="tabbar">
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
