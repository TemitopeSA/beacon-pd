import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { TOUR_STEPS, type TourCtx } from './steps';

interface TourApi {
  active: boolean;
  index: number;
  target: string | string[] | null;
  start: () => void;
  goTo: (i: number) => void;
  next: () => void;
  back: () => void;
  exit: (silent?: boolean) => void;
}

const TourContext = createContext<TourApi | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { demo, dispatch, setUi, toast } = useStore();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<string | string[] | null>(null);
  const timers = useRef<number[]>([]);
  const demoRef = useRef(demo);
  demoRef.current = demo;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const step = TOUR_STEPS[i];
      if (!step) return;
      clearTimers();
      dispatch({ type: 'setScenario', scenario: step.scenario });
      setUi({ guideOpen: false, ...(step.ui ?? {}) });
      setIndex(i);
      setActive(true);
      setTarget(step.target);
      navigate(step.route);
      const ctx: TourCtx = {
        dispatch,
        setUi,
        toast,
        setTarget,
        getDemo: () => demoRef.current,
        at: (ms, fn) => {
          timers.current.push(window.setTimeout(fn, ms));
        },
      };
      step.script?.(ctx);
    },
    [clearTimers, dispatch, navigate, setUi, toast],
  );

  const exit = useCallback(
    (silent?: boolean) => {
      clearTimers();
      setActive(false);
      setTarget(null);
      setUi({ orderDrawerId: null, metricDrawer: null, oliviaIssue: null });
      if (!silent) toast({ title: 'Tour closed', body: 'Open Guide in the bottom-right corner to restart or jump to any step.', tone: 'info' });
    },
    [clearTimers, setUi, toast],
  );

  const next = useCallback(() => {
    if (index >= TOUR_STEPS.length - 1) {
      exit(true);
      toast({ title: 'Tour complete', body: 'Explore freely, or restart from Guide at any time.' });
    } else goTo(index + 1);
  }, [exit, goTo, index, toast]);

  const back = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [goTo, index]);

  const start = useCallback(() => {
    dispatch({ type: 'setWelcomeSeen' });
    goTo(0);
  }, [dispatch, goTo]);

  useEffect(() => {
    if (active) document.body.dataset.tourActive = '1';
    else delete document.body.dataset.tourActive;
  }, [active]);

  useEffect(() => clearTimers, [clearTimers]);

  const api = useMemo(() => ({ active, index, target, start, goTo, next, back, exit }), [active, index, target, start, goTo, next, back, exit]);
  return <TourContext.Provider value={api}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour outside provider');
  return ctx;
}
