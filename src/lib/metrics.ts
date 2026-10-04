import { DATA, startOfDay } from '../data/generate';
import { ASSUMPTIONS, CHANNELS, MAYA } from '../data/seed';
import type { AIOrder, BridgeConfig, ChannelId, DateRange, LoyaltyState } from '../data/types';

const sumAi = (ai: Record<ChannelId, number>) => ai.chatgpt + ai.claude + ai.cashapp + ai.gemini;

export function ordersInRange(range: number): AIOrder[] {
  return DATA.orders.filter((o) => o.dayIndex < range);
}

function evidenceAllowed(o: AIOrder, cfg: BridgeConfig): boolean {
  const ev = o.match.evidence;
  if (!ev) return false;
  return (cfg.matchPhone && (ev === 'phone' || ev === 'both')) || (cfg.matchEmail && (ev === 'email' || ev === 'both'));
}

/** High-confidence match using the merchant's enabled matching signals. */
export function isMatched(o: AIOrder, cfg: BridgeConfig): boolean {
  return o.match.status === 'matched' && evidenceAllowed(o, cfg);
}

/** Would this order earn loyalty if the bridge were on? Ambiguous and guest orders never qualify. */
export function isEligible(o: AIOrder, cfg: BridgeConfig): boolean {
  if (!evidenceAllowed(o, cfg)) return false;
  if (o.match.status === 'matched') return true;
  return o.match.status === 'probable' && cfg.confidence === 'medium';
}

export function loyaltyState(o: AIOrder, cfg: BridgeConfig): LoyaltyState {
  if (isEligible(o, cfg)) return cfg.enabled ? 'rewarded' : 'pending';
  if ((o.match.status === 'probable' || o.match.status === 'ambiguous') && cfg.enabled && cfg.ambiguous === 'review') return 'review';
  return 'not_enrolled';
}

export function starsFor(totalCents: number, cfg: BridgeConfig, firstAiOrder: boolean): number {
  const base = Math.floor(totalCents / 100 / cfg.spendPerStar);
  return base + (cfg.firstOrderBonus && firstAiOrder ? cfg.firstOrderBonusStars : 0);
}

export interface Overview {
  range: DateRange;
  aiOrders: number;
  prevAiOrders: number;
  changePct: number;
  totalOrders: number;
  share: number;
  matched: number;
  matchedRate: number;
  eligible: number;
  rewarded: number;
  revenueCents: number;
  avgCents: number;
  atRiskCents: number;
  byChannel: { id: ChannelId; label: string; orders: number; revenueCents: number }[];
  byStatus: Record<string, number>;
}

export function overview(range: DateRange, cfg: BridgeConfig): Overview {
  const orders = ordersInRange(range);
  const days = DATA.daily.slice(0, range);
  const prevDays = DATA.daily.slice(range, range * 2);
  const aiOrders = orders.length;
  const prevAiOrders = prevDays.reduce((s, d) => s + sumAi(d.ai), 0);
  const totalOrders = days.reduce((s, d) => s + d.app + d.web + sumAi(d.ai), 0);
  const revenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const matched = orders.filter((o) => isMatched(o, cfg)).length;
  const eligibleOrders = orders.filter((o) => isEligible(o, cfg));
  const rewarded = cfg.enabled ? eligibleOrders.length : 0;
  const rewardedCents = cfg.enabled ? eligibleOrders.reduce((s, o) => s + o.totalCents, 0) : 0;
  const byStatus: Record<string, number> = {};
  orders.forEach((o) => {
    const k = o.match.status === 'matched' ? `matched_${o.match.evidence}` : o.match.status;
    byStatus[k] = (byStatus[k] ?? 0) + 1;
  });
  return {
    range,
    aiOrders,
    prevAiOrders,
    changePct: prevAiOrders ? (aiOrders - prevAiOrders) / prevAiOrders : 0,
    totalOrders,
    share: totalOrders ? aiOrders / totalOrders : 0,
    matched,
    matchedRate: aiOrders ? matched / aiOrders : 0,
    eligible: eligibleOrders.length,
    rewarded,
    revenueCents,
    avgCents: aiOrders ? revenueCents / aiOrders : 0,
    atRiskCents: revenueCents - rewardedCents,
    byChannel: CHANNELS.map((c) => {
      const os = orders.filter((o) => o.channel === c.id);
      return { id: c.id, label: c.label, orders: os.length, revenueCents: os.reduce((s, o) => s + o.totalCents, 0) };
    }),
    byStatus,
  };
}

export function weeklySeries(weeks = 12) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const days = DATA.daily.slice(i * 7, i * 7 + 7);
    const end = new Date(startOfDay(i * 7));
    const start = new Date(startOfDay(i * 7 + 6));
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const wkOrders = DATA.orders.filter((o) => o.dayIndex >= i * 7 && o.dayIndex < i * 7 + 7);
    out.push({
      label: fmt(start),
      range: `${fmt(start)} – ${fmt(end)}`,
      ai: days.reduce((s, d) => s + sumAi(d.ai), 0),
      app: days.reduce((s, d) => s + d.app, 0),
      matchRate: wkOrders.length ? wkOrders.filter((o) => o.match.status === 'matched').length / wkOrders.length : 0,
      partial: i === 0,
    });
  }
  return out;
}

const round10 = (x: number) => Math.round(x / 10) * 10;

/** Forward-looking estimate shown on Loyalty Bridge (independent of whether the bridge is on). */
export function projection(cfg: BridgeConfig) {
  const o = overview(30, cfg);
  const installs = Math.round(o.eligible * ASSUMPTIONS.projectedInstallRate);
  return {
    eligible: o.eligible,
    aiOrders: o.aiOrders,
    avgCents: o.avgCents,
    installs,
    revenueCents: round10((installs * ASSUMPTIONS.projectedRepeatOrdersPerInstall * o.avgCents) / 100) * 100,
  };
}

/** Illustrative 30-day outcome for the Results screen, derived from the current configuration. */
export function outcome(cfg: BridgeConfig) {
  const o = overview(30, cfg);
  const on = cfg.enabled;
  const eligibleByDay = new Array(30).fill(0);
  ordersInRange(30).forEach((ord) => {
    if (isEligible(ord, cfg)) eligibleByDay[29 - ord.dayIndex]++;
  });
  let cum = 0;
  const ramp = eligibleByDay.map((n, i) => {
    cum += n;
    return {
      day: i + 1,
      installs: on ? Math.round(cum * ASSUMPTIONS.outcomeInstallRate) : 0,
      revenue: on ? Math.round((cum * ASSUMPTIONS.outcomeRepeatRate * o.avgCents) / 100) : 0,
    };
  });
  return {
    overview: o,
    loyaltyPct: on ? o.eligible / o.aiOrders : 0,
    installs: on ? Math.round(o.eligible * ASSUMPTIONS.outcomeInstallRate) : 0,
    revenueCents: on ? round10((o.eligible * ASSUMPTIONS.outcomeRepeatRate * o.avgCents) / 100) * 100 : 0,
    ramp,
  };
}

export function mayaAiOrder() {
  return DATA.orderById[MAYA.aiOrderId];
}

export const fmtMoney = (cents: number, decimals = 0) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const fmtPct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const fmtDateTime = (ms: number) => {
  const d = new Date(ms);
  const today = startOfDay(0);
  if (ms >= today) return `Today, ${fmtTime(ms)}`;
  if (ms >= today - 86_400_000) return `Yesterday, ${fmtTime(ms)}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${fmtTime(ms)}`;
};
