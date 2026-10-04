/**
 * Deterministic, simulated AI-visibility audit. No live assistant is queried.
 *
 * Score = listing basics (39 of 44) + 1 pt per described item (19) + 1 pt per tagged dietary-relevant item (8)
 *       + 1 pt per item with a photo (19) + holiday hours (5) + ≥2 signature items (5).  Max 100.
 * Starting state: 39 + 5 + 0 + 10 + 0 + 0 = 54.  After Olivia fixes: 39 + 19 + 8 + 10 + 5 + 5 = 86.
 */
import { DIETARY_SUGGESTIONS, MENU_SEED } from '../data/seed';
import type { HolidayHours, MenuItem } from '../data/types';

export interface AuditInput {
  menu: MenuItem[];
  holidayHours: HolidayHours[] | null;
}

export const LISTING_BASICS = [
  { label: 'Business profile & address', score: 10, max: 10 },
  { label: 'Regular operating hours', score: 10, max: 10 },
  { label: 'Direct ordering link', score: 10, max: 10 },
  { label: 'Ratings & review volume', score: 9, max: 14 },
];

const DIETARY_IDS = Object.keys(DIETARY_SUGGESTIONS);

export function auditCounts(s: AuditInput) {
  const described = s.menu.filter((m) => m.description.trim().length > 0).length;
  const tagged = s.menu.filter((m) => DIETARY_IDS.includes(m.id) && m.dietary.length > 0).length;
  const photos = s.menu.filter((m) => m.photo).length;
  const signature = s.menu.filter((m) => m.signature).length;
  return {
    total: s.menu.length,
    described,
    missingDescriptions: s.menu.length - described,
    dietaryRelevant: DIETARY_IDS.length,
    tagged,
    missingDietary: DIETARY_IDS.length - tagged,
    photos,
    missingPhotos: s.menu.length - photos,
    signature,
    holiday: !!s.holidayHours,
  };
}

export function scoreFactors(s: AuditInput) {
  const c = auditCounts(s);
  return [
    { id: 'basics', label: 'Listing basics', score: LISTING_BASICS.reduce((a, b) => a + b.score, 0), max: 44, detail: 'Profile, address, regular hours, ordering link, reviews' },
    { id: 'descriptions', label: 'Menu descriptions', score: c.described, max: c.total, detail: `${c.described} of ${c.total} items described` },
    { id: 'dietary', label: 'Dietary information', score: c.tagged, max: c.dietaryRelevant, detail: `${c.tagged} of ${c.dietaryRelevant} relevant items tagged` },
    { id: 'photos', label: 'Item photography', score: c.photos, max: c.total, detail: `${c.photos} of ${c.total} items have photos` },
    { id: 'holiday', label: 'Holiday hours', score: c.holiday ? 5 : 0, max: 5, detail: c.holiday ? 'Configured through Jan 1' : 'Not configured' },
    { id: 'signature', label: 'Signature items', score: c.signature >= 2 ? 5 : 0, max: 5, detail: c.signature >= 2 ? `${c.signature} items highlighted` : 'None highlighted' },
  ];
}

export function visibilityScore(s: AuditInput): number {
  return scoreFactors(s).reduce((a, f) => a + f.score, 0);
}

export function scoreStatus(score: number): { label: string; tone: 'red' | 'amber' | 'blue' | 'green' } {
  if (score >= 85) return { label: 'Strong', tone: 'green' };
  if (score >= 70) return { label: 'Good', tone: 'blue' };
  if (score >= 40) return { label: 'Fair', tone: 'amber' };
  return { label: 'Weak', tone: 'red' };
}

export const INITIAL_SCORE = visibilityScore({ menu: MENU_SEED, holidayHours: null });

export type IssueId = 'descriptions' | 'dietary' | 'photos' | 'holiday' | 'signature';

export interface Issue {
  id: IssueId;
  title: string;
  resolvedTitle: string;
  severity: 'High' | 'Medium' | 'Low';
  explanation: string;
  impact: string;
  points: number;
  resolved: boolean;
  action: 'olivia' | 'photos';
}

export function auditIssues(s: AuditInput): Issue[] {
  const c = auditCounts(s);
  return [
    {
      id: 'descriptions',
      title: `${c.missingDescriptions} menu items missing descriptions`,
      resolvedTitle: 'All menu items have descriptions',
      severity: 'High',
      explanation: 'Assistants summarize what a storefront offers from its menu text. Items with only a name give them little to match against a request like “creamy oat latte”.',
      impact: `Up to +${c.missingDescriptions} pts. Biggest influence on item-specific queries.`,
      points: c.missingDescriptions,
      resolved: c.missingDescriptions === 0,
      action: 'olivia',
    },
    {
      id: 'dietary',
      title: `Dietary tags missing from ${c.missingDietary} relevant items`,
      resolvedTitle: 'Dietary tags added to relevant items',
      severity: 'High',
      explanation: 'Requests such as “vegan breakfast” or “dairy-free latte” depend on structured dietary attributes. None of your plant-based or nut-containing items are tagged.',
      impact: `Up to +${c.missingDietary} pts. Required for dietary queries.`,
      points: c.missingDietary,
      resolved: c.missingDietary === 0,
      action: 'olivia',
    },
    {
      id: 'photos',
      title: `${c.missingPhotos} items without photos`,
      resolvedTitle: 'All items have photos',
      severity: 'Medium',
      explanation: 'Photos help customers choose and can strengthen how listings are presented. Olivia can’t create product photography — your team uploads real photos.',
      impact: `Up to +${c.missingPhotos} pts once photos are uploaded.`,
      points: c.missingPhotos,
      resolved: c.missingPhotos === 0,
      action: 'photos',
    },
    {
      id: 'holiday',
      title: 'Holiday hours not configured',
      resolvedTitle: 'Holiday hours configured',
      severity: 'Medium',
      explanation: 'Without holiday hours, “open now” answers around Thanksgiving and the new year may be wrong or omitted.',
      impact: c.holiday ? 'Resolved' : '+5 pts. Affects “open now” queries.',
      points: c.holiday ? 0 : 5,
      resolved: c.holiday,
      action: 'olivia',
    },
    {
      id: 'signature',
      title: 'No signature items highlighted',
      resolvedTitle: 'Signature items highlighted',
      severity: 'Low',
      explanation: 'Highlighting what you are known for gives discovery surfaces a clear reason to recommend you for a specific craving.',
      impact: c.signature >= 2 ? 'Resolved' : '+5 pts. Helps “best ___ near me” queries.',
      points: c.signature >= 2 ? 0 : 5,
      resolved: c.signature >= 2,
      action: 'olivia',
    },
  ];
}

// ---- Simulated discovery preview ---------------------------------------------------------------

export type QueryId = 'oat' | 'vegan' | 'open';

export const QUERIES: { id: QueryId; text: string }[] = [
  { id: 'oat', text: 'Best oat latte in Williamsburg' },
  { id: 'vegan', text: 'Vegan breakfast near me' },
  { id: 'open', text: 'Coffee open now near Bedford Avenue' },
];

const COMPETITORS: Record<QueryId, { name: string; score: number; note: string }[]> = {
  oat: [
    { name: 'Halfmoon Café', score: 74, note: 'Detailed latte descriptions, oat milk tagged, photos' },
    { name: 'Copper Kettle Coffee', score: 66, note: 'Oat milk listed as an option on every drink' },
    { name: 'Northside Roasters', score: 49, note: 'Strong reviews, sparse menu data' },
  ],
  vegan: [
    { name: 'Greenleaf Kitchen', score: 71, note: 'Fully tagged plant-based menu' },
    { name: 'Halfmoon Café', score: 63, note: 'Vegan items tagged, few breakfast options' },
    { name: 'Copper Kettle Coffee', score: 52, note: 'One vegan pastry tagged' },
  ],
  open: [
    { name: 'Northside Roasters', score: 79, note: 'Open later, holiday hours published' },
    { name: 'Halfmoon Café', score: 72, note: 'Hours complete' },
    { name: 'Copper Kettle Coffee', score: 68, note: 'Hours complete, farther away' },
  ],
};

export function discovery(q: QueryId, s: AuditInput, merchantName: string) {
  const c = auditCounts(s);
  const item = (id: string) => s.menu.find((m) => m.id === id)!;
  const descCov = c.described / c.total;
  let factors: { label: string; met: boolean; weight: number }[];
  let base: number;
  if (q === 'oat') {
    base = 52;
    factors = [
      { label: 'Oat Latte has a descriptive menu entry', met: !!item('oat-latte').description, weight: 12 },
      { label: 'Oat Latte tagged dairy-free', met: item('oat-latte').dietary.includes('Dairy-free'), weight: 8 },
      { label: 'Oat Latte highlighted as a signature item', met: item('oat-latte').signature, weight: 8 },
      { label: 'Oat Latte has item photography', met: item('oat-latte').photo, weight: 6 },
    ];
  } else if (q === 'vegan') {
    base = 44;
    factors = [
      { label: 'Avocado Toast tagged vegan', met: item('avocado-toast').dietary.includes('Vegan'), weight: 10 },
      { label: 'Avocado Toast has a descriptive menu entry', met: !!item('avocado-toast').description, weight: 8 },
      { label: 'Granola Bowl dietary tags present', met: item('granola-bowl').dietary.length > 0, weight: 6 },
      { label: 'Dietary tags across relevant items', met: c.missingDietary === 0, weight: 8 },
    ];
  } else {
    base = 70;
    factors = [
      { label: 'Regular operating hours published', met: true, weight: 0 },
      { label: 'Holiday hours configured', met: c.holiday, weight: 6 },
      { label: 'Menu descriptions available for summaries', met: c.missingDescriptions === 0, weight: 0 },
    ];
  }
  const merchantScore = Math.round(
    base + factors.reduce((a, f) => a + (f.met ? f.weight : 0), 0) + descCov * (q === 'open' ? 2 : 4),
  );
  const results = [
    ...COMPETITORS[q].map((r) => ({ ...r, isMerchant: false })),
    { name: merchantName, score: merchantScore, note: '', isMerchant: true },
  ].sort((a, b) => b.score - a.score);
  const rank = results.findIndex((r) => r.isMerchant) + 1;
  const unmet = factors.filter((f) => !f.met && f.weight > 0);
  results.forEach((r) => {
    if (r.isMerchant)
      r.note = unmet.length ? `Limited by: ${unmet.map((f) => f.label.toLowerCase()).join('; ')}` : 'Complete, descriptive menu data for this request';
  });

  let answer: string;
  const top = results[0];
  if (q === 'oat') {
    answer =
      rank === 1
        ? `${merchantName} is a strong pick — its Oat Latte is described as a velvety double shot with creamy oat milk, tagged dairy-free, and highlighted as a house favorite. ${results[1].name} is another option nearby.`
        : `${top.name} is frequently recommended for oat lattes. ${results[1].name} is also nearby. ${merchantName} serves an Oat Latte, but there is little detail about it.`;
  } else if (q === 'vegan') {
    answer =
      rank === 1
        ? `${merchantName} has a clearly labeled vegan Avocado Toast on sourdough, plus dairy-free oat lattes and cold brew. ${results[1].name} also has tagged plant-based options.`
        : `${top.name} has a fully tagged plant-based menu. Other spots nearby may have vegan options, but their menus don’t say so explicitly.`;
  } else {
    answer =
      rank === 1
        ? `${merchantName} is open until 6:00 PM today and lists holiday hours through New Year’s Day.`
        : `${top.name} is open now near Bedford Ave. ${merchantName} is open until 6:00 PM today${c.holiday ? ' and publishes holiday hours' : ', though holiday hours are not listed'}.`;
  }
  return { results, rank, factors, merchantScore, answer };
}

export const DESCRIPTION_IDS_MISSING = MENU_SEED.filter((m) => !m.description).map((m) => m.id);
