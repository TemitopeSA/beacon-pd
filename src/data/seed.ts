import type { BridgeConfig, Channel, ChannelId, HolidayHours, Location, MenuItem } from './types';

/** Fixed "now" so every number in the prototype is deterministic. */
export const DEMO_NOW = new Date(2026, 9, 4, 15, 30).getTime();

export const MERCHANT = {
  name: 'Juniper & Bean Coffee',
  short: 'Juniper & Bean',
  plan: 'Pro Plus',
  pos: 'Square',
  owner: 'Jordan Ellis',
  ownerRole: 'Owner',
  ownerEmail: 'jordan@juniperbean.example',
};

export const LOCATIONS: Location[] = [
  { id: 'wburg', name: 'Williamsburg', label: 'Juniper & Bean — Williamsburg', address: 'Bedford Ave & N 7th St, Brooklyn, NY', share: 0.45 },
  { id: 'gpoint', name: 'Greenpoint', label: 'Juniper & Bean — Greenpoint', address: 'Franklin St & Milton St, Brooklyn, NY', share: 0.32 },
  { id: 'pslope', name: 'Park Slope', label: 'Juniper & Bean — Park Slope', address: '7th Ave & 5th St, Brooklyn, NY', share: 0.23 },
];

export const CHANNELS: Channel[] = [
  { id: 'chatgpt', label: 'ChatGPT', short: 'ChatGPT', target30: 318 },
  { id: 'claude', label: 'Claude', short: 'Claude', target30: 141 },
  { id: 'cashapp', label: 'Cash App Neighborhoods', short: 'Cash App', target30: 96 },
  { id: 'gemini', label: 'Gemini', short: 'Gemini', target30: 35 },
];

export const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, Channel>;

/** Snapshot targets for the 30-day window (illustrative prototype data). */
export const TARGETS = {
  totalOrders30: 4820,
  appOrders30: 2610,
  webOrders30: 1620,
  aiRevenueCents30: 873200,
  momGrowth: 1.38,
  matchedHigh30: 360,
  matchedEvidence: { phone: 150, email: 110, both: 100 },
  probable30: 40,
  ambiguous30: 30,
  directAvgTicketCents: 1360,
};

/** Modeling assumptions — surfaced in the UI wherever they are used. */
export const ASSUMPTIONS = {
  projectedInstallRate: 0.59,
  outcomeInstallRate: 0.594,
  outcomeRepeatRate: 0.64,
  projectedRepeatOrdersPerInstall: 1,
};

export const MENU_SEED: MenuItem[] = [
  { id: 'oat-latte', name: 'Oat Latte', category: 'Coffee', priceCents: 575, description: '', photo: false, dietary: [], signature: false },
  { id: 'cortado', name: 'Cortado', category: 'Coffee', priceCents: 430, description: '', photo: true, dietary: [], signature: false },
  { id: 'cold-brew', name: 'Cold Brew', category: 'Coffee', priceCents: 495, description: 'Steeped 18 hours for a smooth, chocolatey finish.', photo: true, dietary: [], signature: false },
  { id: 'flat-white', name: 'Flat White', category: 'Coffee', priceCents: 475, description: '', photo: true, dietary: [], signature: false },
  { id: 'americano', name: 'Americano', category: 'Coffee', priceCents: 375, description: '', photo: true, dietary: [], signature: false },
  { id: 'drip', name: 'Drip Coffee', category: 'Coffee', priceCents: 325, description: 'Rotating single-origin, brewed fresh every hour.', photo: true, dietary: [], signature: false },
  { id: 'espresso', name: 'Espresso', category: 'Coffee', priceCents: 325, description: 'Double shot of our house espresso blend.', photo: true, dietary: [], signature: false },
  { id: 'lavender-latte', name: 'Iced Lavender Latte', category: 'Coffee', priceCents: 625, description: '', photo: false, dietary: [], signature: false },
  { id: 'matcha-latte', name: 'Matcha Latte', category: 'Tea & more', priceCents: 595, description: '', photo: false, dietary: [], signature: false },
  { id: 'chai-latte', name: 'Chai Latte', category: 'Tea & more', priceCents: 525, description: '', photo: false, dietary: [], signature: false },
  { id: 'hot-chocolate', name: 'Hot Chocolate', category: 'Tea & more', priceCents: 450, description: '', photo: false, dietary: [], signature: false },
  { id: 'cardamom-bun', name: 'Cardamom Bun', category: 'Bakery', priceCents: 475, description: '', photo: false, dietary: [], signature: false },
  { id: 'croissant', name: 'Croissant', category: 'Bakery', priceCents: 395, description: 'All-butter croissant, baked each morning.', photo: true, dietary: [], signature: false },
  { id: 'almond-croissant', name: 'Almond Croissant', category: 'Bakery', priceCents: 495, description: '', photo: false, dietary: [], signature: false },
  { id: 'banana-bread', name: 'Banana Bread', category: 'Bakery', priceCents: 395, description: '', photo: false, dietary: [], signature: false },
  { id: 'avocado-toast', name: 'Avocado Toast', category: 'Breakfast', priceCents: 1050, description: '', photo: true, dietary: [], signature: false },
  { id: 'breakfast-burrito', name: 'Breakfast Burrito', category: 'Breakfast', priceCents: 1125, description: '', photo: true, dietary: [], signature: false },
  { id: 'egg-cheese', name: 'Egg & Cheese Sandwich', category: 'Breakfast', priceCents: 875, description: 'Soft scrambled eggs and cheddar on a toasted brioche bun.', photo: true, dietary: [], signature: false },
  { id: 'granola-bowl', name: 'Granola Bowl', category: 'Breakfast', priceCents: 850, description: '', photo: false, dietary: [], signature: false },
];

export const DRINK_CATEGORIES = ['Coffee', 'Tea & more'];

/** Olivia's prepared description suggestions (deterministic, editable before applying). */
export const DESCRIPTION_SUGGESTIONS: Record<string, string> = {
  'oat-latte': 'Velvety double-shot espresso with creamy Oatly oat milk, available in 12 oz. A smooth, dairy-free favorite.',
  cortado: 'Equal parts espresso and steamed milk for a short, balanced, naturally sweet sip. 4.5 oz.',
  'flat-white': 'Double ristretto with a thin layer of silky microfoam. Bold, smooth, and served at 8 oz.',
  americano: 'Two shots of house espresso lengthened with hot water. Clean and bright, served hot or iced.',
  'lavender-latte': 'House-made lavender syrup, espresso, and your choice of milk over ice. Floral, lightly sweet, and refreshing.',
  'matcha-latte': 'Ceremonial-grade Uji matcha whisked to order with steamed milk. Earthy, creamy, and gently sweet; oat milk available.',
  'chai-latte': 'Spiced black tea concentrate brewed in-house with cardamom, ginger, and cinnamon, finished with steamed milk.',
  'hot-chocolate': 'Rich 70% dark chocolate melted into steamed milk and topped with soft foam.',
  'cardamom-bun': 'Our signature Scandinavian-style knot, laminated with cardamom sugar and baked fresh every morning.',
  'almond-croissant': 'Twice-baked butter croissant filled with almond frangipane and finished with toasted sliced almonds.',
  'banana-bread': 'Moist, house-baked loaf with ripe bananas, brown sugar, and a hint of cinnamon. Sliced to order.',
  'avocado-toast': 'Smashed avocado on toasted sourdough with lemon, chili flakes, and flaky sea salt. Fully plant-based.',
  'breakfast-burrito': 'Scrambled eggs, crispy potatoes, black beans, cheddar, and salsa verde in a warm flour tortilla.',
  'granola-bowl': 'House-made maple granola with Greek yogurt, seasonal fruit, and a drizzle of local honey.',
};

export const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Dairy-free', 'Gluten-free', 'Contains nuts'];

/** Items where dietary information matters to discovery, with Olivia's suggested tags. */
export const DIETARY_SUGGESTIONS: Record<string, string[]> = {
  'oat-latte': ['Vegan', 'Dairy-free'],
  'cold-brew': ['Vegan', 'Dairy-free'],
  'matcha-latte': ['Vegetarian'],
  'cardamom-bun': ['Vegetarian'],
  'almond-croissant': ['Vegetarian', 'Contains nuts'],
  'avocado-toast': ['Vegan', 'Dairy-free'],
  'breakfast-burrito': ['Vegetarian'],
  'granola-bowl': ['Vegetarian', 'Contains nuts'],
};

export const SIGNATURE_SUGGESTIONS = ['oat-latte', 'cardamom-bun', 'lavender-latte'];

export const HOLIDAY_SUGGESTIONS: HolidayHours[] = [
  { id: 'thanksgiving', name: 'Thanksgiving', date: 'Thu, Nov 26', hours: '8:00 AM – 2:00 PM' },
  { id: 'xmas-eve', name: 'Christmas Eve', date: 'Thu, Dec 24', hours: '7:00 AM – 3:00 PM' },
  { id: 'xmas', name: 'Christmas Day', date: 'Fri, Dec 25', hours: 'Closed' },
  { id: 'nye', name: "New Year's Eve", date: 'Thu, Dec 31', hours: '7:00 AM – 4:00 PM' },
  { id: 'nyd', name: "New Year's Day", date: 'Fri, Jan 1', hours: '9:00 AM – 3:00 PM' },
];

export const REGULAR_HOURS = [
  { day: 'Monday – Friday', hours: '7:00 AM – 6:00 PM' },
  { day: 'Saturday', hours: '8:00 AM – 6:00 PM' },
  { day: 'Sunday', hours: '8:00 AM – 5:00 PM' },
];

export const LOYALTY_PROGRAM = {
  name: 'Bean Club',
  rewardAt: 12,
  rewardName: 'Free drink of your choice',
};

export const MAYA = {
  id: 'cus_maya',
  name: 'Maya R.',
  phone: '(718) 555-0142',
  email: 'maya.r@example.com',
  startingStars: 8,
  startingStreakWeeks: 3,
  aiOrderId: 'ord_maya_ai',
  followUpOrderId: 'ord_maya_app',
};

export const DEFAULT_TEMPLATE =
  "Thanks for ordering from {merchant} via {channel}! You've earned {stars} stars. Open our app to continue your streak: [demo app link]";

export const DEFAULT_BRIDGE: BridgeConfig = {
  enabled: false,
  matchPhone: true,
  matchEmail: true,
  confidence: 'high',
  ambiguous: 'review',
  spendPerStar: 5,
  firstOrderBonus: false,
  firstOrderBonusStars: 1,
  streakPreservation: true,
  followUp: true,
  followUpChannel: 'sms',
  template: DEFAULT_TEMPLATE,
};

export const FIRST_NAMES = [
  'Alex', 'Priya', 'Daniel', 'Sofia', 'Marcus', 'Hannah', 'Leo', 'Nina', 'Theo', 'Ava', 'Jonah', 'Grace', 'Omar', 'Lena', 'Felix',
  'Chloe', 'Isaac', 'Rosa', 'Kai', 'Imani', 'Ben', 'Elena', 'Sam', 'Zoe', 'Ravi', 'Julia', 'Malik', 'Iris', 'Noah', 'Mei', 'Owen',
  'Tara', 'Diego', 'Ruth', 'Ezra', 'Lucy', 'Hugo', 'Amara', 'Cole', 'Yara',
];
export const LAST_INITIALS = 'ABCDEFGHJKLMNPRSTVWY'.split('');
