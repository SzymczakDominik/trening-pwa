import { create } from 'zustand';

export type Tab = 'today' | 'plan' | 'calendar' | 'progress' | 'more';
export type View =
  | { name: 'library' }
  | { name: 'planDetail'; id: string }
  | { name: 'editWorkout'; blockIndex: number; workoutId: string }
  | { name: 'workout' }
  | { name: 'exercise'; id: string }
  | { name: 'session'; id: string }
  | { name: 'tools' }
  | { name: 'account' }
  | { name: 'strava' }
  | { name: 'settings' }
  | { name: 'method' }
  | { name: 'install' }
  | { name: 'onboarding' };

interface Nav {
  tab: Tab;
  stack: View[];
  setTab(t: Tab): void;
  push(v: View): void;
  pop(): void;
  reset(): void;
}

export const useNav = create<Nav>((set) => ({
  tab: 'today',
  stack: [],
  setTab: (tab) => set({ tab, stack: [] }),
  push: (v) => { set((s) => ({ stack: [...s.stack, v] })); window.scrollTo(0, 0); },
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  reset: () => set({ stack: [] }),
}));
