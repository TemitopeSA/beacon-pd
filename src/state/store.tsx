import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_BRIDGE, DESCRIPTION_SUGGESTIONS, DIETARY_SUGGESTIONS, HOLIDAY_SUGGESTIONS, LOCATIONS, MENU_SEED, SIGNATURE_SUGGESTIONS,
} from '../data/seed';
import type { BridgeConfig, DateRange, HolidayHours, MenuItem, ChannelId } from '../data/types';
import type { IssueId, QueryId } from '../lib/visibility';

export type MetricKind = 'risk' | 'match';
export type Scenario = 'baseline' | 'fixed' | 'bridged';

export interface FixRecord {
  issue: IssueId;
  at: number;
  summary: string;
}

export interface DemoState {
  locationId: string;
  dateRange: DateRange;
  menu: MenuItem[];
  holidayHours: HolidayHours[] | null;
  photoShotList: boolean;
  bridge: BridgeConfig;
  fixes: FixRecord[];
  welcomeSeen: boolean;
  founderNotes: boolean;
}

export interface UiState {
  bannerDismissed: boolean;
  orderDrawerId: string | null;
  metricDrawer: MetricKind | null;
  oliviaIssue: IssueId | null;
  discoveryQuery: QueryId;
  expandedIssue: IssueId | null;
  phoneTab: 'sms' | 'app';
  previewNonce: number;
  expandedTimeline: string | null;
  channelFilter: ChannelId | null;
  guideOpen: boolean;
  mobileNav: boolean;
}

export const INITIAL_DEMO: DemoState = {
  locationId: LOCATIONS[0].id,
  dateRange: 30,
  menu: MENU_SEED,
  holidayHours: null,
  photoShotList: false,
  bridge: DEFAULT_BRIDGE,
  fixes: [],
  welcomeSeen: false,
  founderNotes: false,
};

const INITIAL_UI: UiState = {
  bannerDismissed: false,
  orderDrawerId: null,
  metricDrawer: null,
  oliviaIssue: null,
  discoveryQuery: 'oat',
  expandedIssue: null,
  phoneTab: 'sms',
  previewNonce: 0,
  expandedTimeline: null,
  channelFilter: null,
  guideOpen: false,
  mobileNav: false,
};

export type Action =
  | { type: 'setLocation'; id: string }
  | { type: 'setDateRange'; range: DateRange }
  | { type: 'applyDescriptions'; edits: Record<string, string> }
  | { type: 'applyDietary'; edits: Record<string, string[]> }
  | { type: 'applyHoliday'; hours: HolidayHours[] }
  | { type: 'applySignature'; ids: string[] }
  | { type: 'createShotList' }
  | { type: 'setBridge'; patch: Partial<BridgeConfig> }
  | { type: 'setWelcomeSeen' }
  | { type: 'setFounderNotes'; on: boolean }
  | { type: 'setScenario'; scenario: Scenario }
  | { type: 'reset' }
  | { type: 'ui'; patch: Partial<UiState> };

interface Full {
  demo: DemoState;
  ui: UiState;
}

const fix = (issue: IssueId, summary: string): FixRecord => ({ issue, summary, at: Date.now() });

function demoReducer(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case 'setLocation':
      return { ...s, locationId: a.id };
    case 'setDateRange':
      return { ...s, dateRange: a.range };
    case 'applyDescriptions': {
      const n = Object.keys(a.edits).length;
      if (!n) return s;
      return {
        ...s,
        menu: s.menu.map((m) => (a.edits[m.id] !== undefined ? { ...m, description: a.edits[m.id].trim() } : m)),
        fixes: [...s.fixes, fix('descriptions', `Added descriptions to ${n} item${n === 1 ? '' : 's'}`)],
      };
    }
    case 'applyDietary': {
      const n = Object.keys(a.edits).length;
      if (!n) return s;
      return {
        ...s,
        menu: s.menu.map((m) => (a.edits[m.id] ? { ...m, dietary: a.edits[m.id] } : m)),
        fixes: [...s.fixes, fix('dietary', `Tagged dietary info on ${n} item${n === 1 ? '' : 's'}`)],
      };
    }
    case 'applyHoliday':
      return { ...s, holidayHours: a.hours, fixes: [...s.fixes, fix('holiday', `Configured ${a.hours.length} holiday dates`)] };
    case 'applySignature':
      return {
        ...s,
        menu: s.menu.map((m) => ({ ...m, signature: a.ids.includes(m.id) })),
        fixes: [...s.fixes, fix('signature', `Highlighted ${a.ids.length} signature items`)],
      };
    case 'createShotList':
      return { ...s, photoShotList: true };
    case 'setBridge':
      return { ...s, bridge: { ...s.bridge, ...a.patch } };
    case 'setWelcomeSeen':
      return { ...s, welcomeSeen: true };
    case 'setFounderNotes':
      return { ...s, founderNotes: a.on };
    case 'setScenario': {
      const base: DemoState = { ...INITIAL_DEMO, welcomeSeen: true, founderNotes: s.founderNotes, locationId: s.locationId, dateRange: 30 };
      if (a.scenario === 'baseline') return base;
      const fixed = applyAllFixes(base);
      if (a.scenario === 'fixed') return fixed;
      return { ...fixed, bridge: { ...fixed.bridge, enabled: true } };
    }
    case 'reset':
      return { ...INITIAL_DEMO, welcomeSeen: true, founderNotes: s.founderNotes };
    default:
      return s;
  }
}

export function demoDescriptionEdits(menu: MenuItem[]) {
  return Object.fromEntries(menu.filter((m) => !m.description).map((m) => [m.id, DESCRIPTION_SUGGESTIONS[m.id] ?? '']));
}
export function demoDietaryEdits(menu: MenuItem[]) {
  return Object.fromEntries(
    menu.filter((m) => DIETARY_SUGGESTIONS[m.id] && m.dietary.length === 0).map((m) => [m.id, DIETARY_SUGGESTIONS[m.id]]),
  );
}

function applyAllFixes(s: DemoState): DemoState {
  let n = demoReducer(s, { type: 'applyDescriptions', edits: demoDescriptionEdits(s.menu) });
  n = demoReducer(n, { type: 'applyDietary', edits: demoDietaryEdits(n.menu) });
  n = demoReducer(n, { type: 'applyHoliday', hours: HOLIDAY_SUGGESTIONS });
  n = demoReducer(n, { type: 'applySignature', ids: SIGNATURE_SUGGESTIONS });
  return n;
}

function reducer(s: Full, a: Action): Full {
  if (a.type === 'ui') return { ...s, ui: { ...s.ui, ...a.patch } };
  const demo = demoReducer(s.demo, a);
  if (a.type === 'reset' || a.type === 'setScenario') {
    return { demo, ui: { ...INITIAL_UI, bannerDismissed: a.type === 'reset' ? false : s.ui.bannerDismissed } };
  }
  return { ...s, demo };
}

const STORAGE_KEY = 'beacon-demo-v1';
const SESSION_KEY = 'beacon-banner-dismissed';

function load(): Full {
  let demo = INITIAL_DEMO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      demo = { ...INITIAL_DEMO, ...parsed, bridge: { ...DEFAULT_BRIDGE, ...(parsed.bridge ?? {}) } };
      if (!Array.isArray(demo.menu) || demo.menu.length !== MENU_SEED.length) demo = { ...demo, menu: MENU_SEED };
    }
  } catch {
    /* ignore */
  }
  let bannerDismissed = false;
  try {
    bannerDismissed = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    /* ignore */
  }
  return { demo, ui: { ...INITIAL_UI, bannerDismissed } };
}

// ---- Toasts -----------------------------------------------------------------------------------

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'success' | 'info';
}

interface Ctx {
  demo: DemoState;
  ui: UiState;
  dispatch: (a: Action) => void;
  setUi: (patch: Partial<UiState>) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.demo));
    } catch {
      /* ignore */
    }
  }, [state.demo]);

  useEffect(() => {
    try {
      if (state.ui.bannerDismissed) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [state.ui.bannerDismissed]);

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );
  const setUi = useCallback((patch: Partial<UiState>) => dispatch({ type: 'ui', patch }), []);

  const value = useMemo(
    () => ({ demo: state.demo, ui: state.ui, dispatch, setUi, toasts, toast, dismissToast }),
    [state, setUi, toasts, toast, dismissToast],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

export const SYNC_TOAST = { title: 'Demo sync complete — menu content updated in the prototype.', tone: 'success' as const };
