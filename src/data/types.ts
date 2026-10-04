export type ChannelId = 'chatgpt' | 'claude' | 'cashapp' | 'gemini';
export type DirectSource = 'app' | 'web' | 'instore';
export type MatchStatus = 'matched' | 'probable' | 'ambiguous' | 'guest';
export type Evidence = 'phone' | 'email' | 'both' | null;
export type DateRange = 7 | 30 | 90;
export type LoyaltyState = 'rewarded' | 'pending' | 'review' | 'not_enrolled';

export interface Location {
  id: string;
  name: string;
  label: string;
  address: string;
  share: number;
}

export interface Channel {
  id: ChannelId;
  label: string;
  short: string;
  /** Orders in the 30-day demo window. */
  target30: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Coffee' | 'Tea & more' | 'Bakery' | 'Breakfast';
  priceCents: number;
  description: string;
  photo: boolean;
  dietary: string[];
  signature: boolean;
}

export interface OrderLine {
  itemId: string;
  qty: number;
}

export interface OrderMatch {
  status: MatchStatus;
  evidence: Evidence;
  customerId: string | null;
  /** Candidate customer records for ambiguous orders. */
  candidates: number;
  /** Mock confidence 0–1. */
  confidence: number;
}

export interface AIOrder {
  id: string;
  number: string;
  channel: ChannelId;
  placedAt: number;
  dayIndex: number;
  locationId: string;
  lines: OrderLine[];
  totalCents: number;
  match: OrderMatch;
}

export interface DirectOrder {
  id: string;
  number: string;
  source: DirectSource;
  placedAt: number;
  locationId: string;
  lines: OrderLine[];
  totalCents: number;
  customerId: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phoneMasked: string;
  emailMasked: string;
  loyaltyMember: boolean;
  stars: number;
  /** Orders placed outside AI channels (POS, app, web). */
  directOrders: number;
  directSpendCents: number;
  appInstalled: boolean;
  smsOptIn: boolean;
  pushOptIn: boolean;
  memberSince: string;
  homeLocationId: string;
}

export interface DailyPoint {
  dayIndex: number;
  date: number;
  ai: Record<ChannelId, number>;
  app: number;
  web: number;
}

export interface HolidayHours {
  id: string;
  name: string;
  date: string;
  hours: string;
}

export interface BridgeConfig {
  enabled: boolean;
  matchPhone: boolean;
  matchEmail: boolean;
  confidence: 'high' | 'medium';
  ambiguous: 'review' | 'skip';
  spendPerStar: number;
  firstOrderBonus: boolean;
  firstOrderBonusStars: number;
  streakPreservation: boolean;
  followUp: boolean;
  followUpChannel: 'sms' | 'push';
  template: string;
}
