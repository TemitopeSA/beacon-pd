/**
 * Deterministic mock-data generator. Everything in the prototype derives from DATA.
 *
 * The 30-day window is constructed to hit the snapshot exactly:
 *   590 AI orders (ChatGPT 318, Claude 141, Cash App 96, Gemini 35), $8,732.00 of AI order value,
 *   360 high-confidence matches (61%), and 4,820 total orders.
 */
import { mulberry32, allocate, shuffle, sum, pickWeighted, type Rng } from '../lib/rng';
import {
  CHANNELS, DEMO_NOW, DRINK_CATEGORIES, FIRST_NAMES, LAST_INITIALS, LOCATIONS, MAYA, MENU_SEED, TARGETS,
} from './seed';
import type { AIOrder, ChannelId, Customer, DailyPoint, DirectOrder, OrderLine, Evidence } from './types';

export const HISTORY_DAYS = 180;
export const ORDER_DAYS = 90;

export function startOfDay(dayIndex: number): number {
  const d = new Date(DEMO_NOW);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayIndex);
  return d.getTime();
}

const PRICE = Object.fromEntries(MENU_SEED.map((m) => [m.id, m.priceCents])) as Record<string, number>;

export function linesTotal(lines: OrderLine[]): number {
  return sum(lines.map((l) => PRICE[l.itemId] * l.qty));
}

function dailySeries(total30: number, growth: number, weekendLift: number, rnd: Rng): number[] {
  const g = Math.log(growth) / 30;
  const w = Array.from({ length: HISTORY_DAYS }, (_, d) => {
    const dow = new Date(startOfDay(d)).getDay();
    const wk = dow === 0 || dow === 6 ? weekendLift : 1;
    const partial = d === 0 ? 0.62 : 1; // today is only half over
    return Math.exp(-g * d) * wk * partial * (0.86 + rnd() * 0.28);
  });
  const out: number[] = new Array(HISTORY_DAYS).fill(0);
  const fill = (start: number, total: number) =>
    allocate(total, w.slice(start, start + 30)).forEach((v, i) => (out[start + i] = v));
  const prev = Math.round(total30 / growth);
  fill(0, total30);
  fill(30, prev);
  const scale = prev / sum(w.slice(30, 60));
  for (let s = 60; s < HISTORY_DAYS; s += 30) fill(s, Math.round(sum(w.slice(s, s + 30)) * scale));
  return out;
}

interface Combo {
  ids: string[];
  cents: number;
  kind: 'd' | 'df' | 'dd' | 'ddf';
}

function toLines(ids: string[]): OrderLine[] {
  const m = new Map<string, number>();
  ids.forEach((id) => m.set(id, (m.get(id) ?? 0) + 1));
  return [...m].map(([itemId, qty]) => ({ itemId, qty }));
}

function buildCombos(): Combo[] {
  const drinks = MENU_SEED.filter((m) => DRINK_CATEGORIES.includes(m.category)).map((m) => m.id);
  const foods = MENU_SEED.filter((m) => !DRINK_CATEGORIES.includes(m.category)).map((m) => m.id);
  const out: Combo[] = [];
  const add = (ids: string[], kind: Combo['kind']) => {
    const cents = sum(ids.map((id) => PRICE[id]));
    if (cents <= 2800) out.push({ ids, cents, kind });
  };
  drinks.forEach((d) => add([d], 'd'));
  drinks.forEach((d) => foods.forEach((f) => add([d, f], 'df')));
  drinks.forEach((d1, i) =>
    drinks.slice(i).forEach((d2) => {
      add([d1, d2], 'dd');
      foods.forEach((f) => add([d1, d2, f], 'ddf'));
    }),
  );
  return out.sort((a, b) => a.cents - b.cents);
}

const COMBOS = buildCombos();

function nearestCombo(want: number, rnd: Rng): Combo {
  let lo = 0;
  let hi = COMBOS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (COMBOS[mid].cents < want) lo = mid + 1;
    else hi = mid;
  }
  let idx = lo;
  if (idx > 0 && Math.abs(COMBOS[idx - 1].cents - want) < Math.abs(COMBOS[idx].cents - want)) idx = idx - 1;
  const cents = COMBOS[idx].cents;
  let a = idx;
  let b = idx;
  while (a > 0 && COMBOS[a - 1].cents === cents) a--;
  while (b < COMBOS.length - 1 && COMBOS[b + 1].cents === cents) b++;
  return COMBOS[a + Math.floor(rnd() * (b - a + 1))];
}

/** Nudge order baskets until the window's AI order value is exact. */
function tuneWindow(orders: AIOrder[], targetCents: number, rnd: Rng) {
  const pool = orders.filter((o) => o.id !== MAYA.aiOrderId);
  let total = sum(orders.map((o) => o.totalCents));
  for (let guard = 0; total !== targetCents && guard < 40000; guard++) {
    const diff = targetCents - total;
    const o = pool[Math.floor(rnd() * pool.length)];
    const step = Math.max(-700, Math.min(700, diff));
    const c = nearestCombo(o.totalCents + step, rnd);
    const next = total - o.totalCents + c.cents;
    if (Math.abs(targetCents - next) >= Math.abs(diff)) continue;
    o.lines = toLines(c.ids);
    o.totalCents = c.cents;
    total = next;
  }
}

function pickTime(dayIndex: number, rnd: Rng): number {
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const weights = [8, 12, 13, 11, 9, 8, 9, 7, 5, 4, 3, 2];
  const allowed = dayIndex === 0 ? 8 : hours.length; // today: up to 2:59 PM
  const h = pickWeighted(hours.slice(0, allowed), weights.slice(0, allowed), rnd);
  const m = Math.floor(rnd() * 60);
  return startOfDay(dayIndex) + (h * 60 + m) * 60_000;
}

function pickLocation(rnd: Rng): string {
  return pickWeighted(LOCATIONS.map((l) => l.id), LOCATIONS.map((l) => l.share), rnd);
}

const MAYA_HISTORY_DAYS = [6, 13, 20, 27, 41, 55, 69, 90, 118, 150, 190];
const MAYA_HISTORY_BASKETS: string[][] = [
  ['oat-latte', 'cardamom-bun'],
  ['oat-latte'],
  ['oat-latte', 'avocado-toast'],
  ['cortado', 'cardamom-bun'],
  ['oat-latte'],
];

export interface MayaVisit {
  id: string;
  placedAt: number;
  lines: OrderLine[];
  totalCents: number;
  source: 'instore';
}

function build() {
  const rnd = mulberry32(20261004);

  // ---- Daily aggregate series ---------------------------------------------------------------
  const aiSeries = Object.fromEntries(
    CHANNELS.map((c) => [c.id, dailySeries(c.target30, TARGETS.momGrowth, 1.15, rnd)]),
  ) as Record<ChannelId, number[]>;
  const appSeries = dailySeries(TARGETS.appOrders30, 1.03, 1.25, rnd);
  const webSeries = dailySeries(TARGETS.webOrders30, 1.02, 1.2, rnd);
  if (aiSeries.chatgpt[0] < 1) aiSeries.chatgpt[0] = 1; // guarantees a slot for Maya's order today

  const daily: DailyPoint[] = Array.from({ length: HISTORY_DAYS }, (_, d) => ({
    dayIndex: d,
    date: startOfDay(d),
    ai: Object.fromEntries(CHANNELS.map((c) => [c.id, aiSeries[c.id][d]])) as Record<ChannelId, number>,
    app: appSeries[d],
    web: webSeries[d],
  }));

  // ---- Customers ---------------------------------------------------------------------------
  const nameSet = new Set<string>(['Maya R.']);
  const customers: Customer[] = [
    {
      id: MAYA.id,
      name: MAYA.name,
      phoneMasked: '(•••) •••-0142',
      emailMasked: 'maya.r•••@example.com',
      loyaltyMember: true,
      stars: MAYA.startingStars,
      directOrders: MAYA_HISTORY_DAYS.length,
      directSpendCents: 0,
      appInstalled: false,
      smsOptIn: true,
      pushOptIn: false,
      memberSince: 'Mar 2025',
      homeLocationId: 'wburg',
    },
  ];
  while (customers.length < 260) {
    const name = `${FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)]} ${LAST_INITIALS[Math.floor(rnd() * LAST_INITIALS.length)]}.`;
    if (nameSet.has(name)) continue;
    nameSet.add(name);
    const directOrders = 1 + Math.floor(Math.pow(rnd(), 1.4) * 44);
    const spend = directOrders * (1100 + Math.floor(rnd() * 500));
    const member = rnd() < 0.86;
    const app = rnd() < 0.42;
    const four = String(100 + Math.floor(rnd() * 99)).slice(1);
    const year = 2022 + Math.floor(rnd() * 4);
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor(rnd() * 12)];
    customers.push({
      id: `cus_${String(customers.length).padStart(3, '0')}`,
      name,
      phoneMasked: `(•••) •••-01${four}`,
      emailMasked: `${name[0].toLowerCase()}•••@example.com`,
      loyaltyMember: member,
      stars: member ? Math.floor(spend / 500) % 12 : 0,
      directOrders,
      directSpendCents: spend,
      appInstalled: app,
      smsOptIn: rnd() < 0.7,
      pushOptIn: app && rnd() < 0.6,
      memberSince: `${month} ${year}`,
      homeLocationId: pickLocation(rnd),
    });
  }
  const pickCustomer = () => customers[1 + Math.floor(Math.pow(rnd(), 1.5) * (customers.length - 1))].id;

  // ---- Maya's in-store history --------------------------------------------------------------
  const mayaVisits: MayaVisit[] = MAYA_HISTORY_DAYS.map((d, i) => {
    const lines = toLines(MAYA_HISTORY_BASKETS[i % MAYA_HISTORY_BASKETS.length]);
    return {
      id: `pos_maya_${i}`,
      placedAt: startOfDay(d) + (8 * 60 + 5 + i * 7) * 60_000,
      lines,
      totalCents: linesTotal(lines),
      source: 'instore',
    };
  });
  customers[0].directSpendCents = sum(mayaVisits.map((v) => v.totalCents));

  // ---- AI orders -------------------------------------------------------------------------
  const orders: AIOrder[] = [];
  const kinds: Combo['kind'][] = ['d', 'df', 'dd', 'ddf'];
  const byKind = Object.fromEntries(kinds.map((k) => [k, COMBOS.filter((c) => c.kind === k)])) as Record<Combo['kind'], Combo[]>;
  let seq = 0;
  for (let d = 0; d < ORDER_DAYS; d++) {
    for (const c of CHANNELS) {
      for (let k = 0; k < aiSeries[c.id][d]; k++) {
        const kind = pickWeighted(kinds, [10, 40, 10, 40], rnd);
        const combo = byKind[kind][Math.floor(rnd() * byKind[kind].length)];
        orders.push({
          id: `ord_${(seq++).toString(36).padStart(4, '0')}`,
          number: '',
          channel: c.id,
          placedAt: pickTime(d, rnd),
          dayIndex: d,
          locationId: pickLocation(rnd),
          lines: toLines(combo.ids),
          totalCents: combo.cents,
          match: { status: 'guest', evidence: null, customerId: null, candidates: 0, confidence: 0 },
        });
      }
    }
  }

  // Maya's ChatGPT order (today, 9:12 AM, Williamsburg)
  const mayaSlot = orders.find((o) => o.dayIndex === 0 && o.channel === 'chatgpt')!;
  Object.assign(mayaSlot, {
    id: MAYA.aiOrderId,
    placedAt: startOfDay(0) + (9 * 60 + 12) * 60_000,
    locationId: 'wburg',
    lines: toLines(['oat-latte', 'cardamom-bun', 'cortado']),
    totalCents: 1480,
    match: { status: 'matched', evidence: 'phone', customerId: MAYA.id, candidates: 1, confidence: 0.98 },
  } satisfies Partial<AIOrder>);

  // ---- Identity matching -------------------------------------------------------------------
  const conf = (lo: number, hi: number) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
  const window30 = shuffle(orders.filter((o) => o.dayIndex < 30 && o.id !== MAYA.aiOrderId), rnd);
  const plan: [number, (o: AIOrder) => void][] = [
    [TARGETS.matchedEvidence.phone - 1, (o) => (o.match = { status: 'matched', evidence: 'phone', customerId: pickCustomer(), candidates: 1, confidence: conf(0.9, 0.99) })],
    [TARGETS.matchedEvidence.email, (o) => (o.match = { status: 'matched', evidence: 'email', customerId: pickCustomer(), candidates: 1, confidence: conf(0.88, 0.98) })],
    [TARGETS.matchedEvidence.both, (o) => (o.match = { status: 'matched', evidence: 'both', customerId: pickCustomer(), candidates: 1, confidence: conf(0.95, 0.99) })],
    [TARGETS.probable30, (o) => (o.match = { status: 'probable', evidence: rnd() < 0.5 ? 'phone' : 'email', customerId: pickCustomer(), candidates: 1, confidence: conf(0.6, 0.79) })],
    [TARGETS.ambiguous30, (o) => (o.match = { status: 'ambiguous', evidence: 'phone', customerId: null, candidates: 2 + Math.floor(rnd() * 2), confidence: conf(0.3, 0.5) })],
  ];
  let cursor = 0;
  for (const [count, assign] of plan) for (let i = 0; i < count; i++) assign(window30[cursor++]);

  for (const o of orders) {
    if (o.dayIndex < 30) continue;
    const r = rnd();
    const ev: Evidence = r < 0.25 ? 'phone' : r < 0.43 ? 'email' : 'both';
    if (r < 0.58) o.match = { status: 'matched', evidence: ev, customerId: pickCustomer(), candidates: 1, confidence: conf(0.88, 0.99) };
    else if (r < 0.65) o.match = { status: 'probable', evidence: 'email', customerId: pickCustomer(), candidates: 1, confidence: conf(0.6, 0.79) };
    else if (r < 0.7) o.match = { status: 'ambiguous', evidence: 'phone', customerId: null, candidates: 2, confidence: conf(0.3, 0.5) };
  }

  // ---- Exact order value per 30-day window (avg $14.80) ------------------------------------
  for (let s = 0; s < ORDER_DAYS; s += 30) {
    const win = orders.filter((o) => o.dayIndex >= s && o.dayIndex < s + 30);
    const target = s === 0 ? TARGETS.aiRevenueCents30 : win.length * 1480;
    tuneWindow(win, target, rnd);
  }

  // ---- Direct (app / web) orders for the Orders screen --------------------------------------
  const direct: DirectOrder[] = [];
  for (let d = 0; d < 2; d++) {
    const n = d === 0 ? 46 : 64;
    for (let k = 0; k < n; k++) {
      const kind = pickWeighted(kinds, [20, 40, 15, 25], rnd);
      const combo = byKind[kind][Math.floor(rnd() * byKind[kind].length)];
      const source = rnd() < 0.62 ? 'app' : 'web';
      direct.push({
        id: `dir_${d}_${k}`,
        number: '',
        source,
        placedAt: pickTime(d, rnd),
        locationId: pickLocation(rnd),
        lines: toLines(combo.ids),
        totalCents: combo.cents,
        customerId: source === 'app' || rnd() < 0.5 ? pickCustomer() : null,
      });
    }
  }

  // ---- Order numbers in chronological order -------------------------------------------------
  const all = [...orders, ...direct].sort((a, b) => a.placedAt - b.placedAt);
  all.forEach((o, i) => (o.number = `#${48210 + i}`));

  orders.sort((a, b) => b.placedAt - a.placedAt);
  direct.sort((a, b) => b.placedAt - a.placedAt);

  return {
    daily,
    orders,
    direct,
    customers,
    customerById: Object.fromEntries(customers.map((c) => [c.id, c])) as Record<string, Customer>,
    orderById: Object.fromEntries(orders.map((o) => [o.id, o])) as Record<string, AIOrder>,
    mayaVisits,
  };
}

export const DATA = build();

/** Illustrative follow-up app order — only shown once the Loyalty Bridge scenario is active. */
export const MAYA_APP_ORDER = {
  id: MAYA.followUpOrderId,
  placedAt: startOfDay(0) + (13 * 60 + 48) * 60_000,
  lines: toLines(['matcha-latte', 'banana-bread']),
  get totalCents() {
    return linesTotal(this.lines);
  },
};
