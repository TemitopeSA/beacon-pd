import { HOLIDAY_SUGGESTIONS, MAYA, SIGNATURE_SUGGESTIONS } from '../data/seed';
import { demoDescriptionEdits, demoDietaryEdits, SYNC_TOAST, type Action, type DemoState, type Scenario, type Toast, type UiState } from '../state/store';

export interface TourCtx {
  dispatch: (a: Action) => void;
  setUi: (p: Partial<UiState>) => void;
  setTarget: (id: string | string[]) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  /** Schedule a cancellable scripted action (cleared on Back/Next/Skip/Exit). */
  at: (ms: number, fn: () => void) => void;
  getDemo: () => DemoState;
}

export interface TourStep {
  id: string;
  route: string;
  /** Stable data-tour ids; the first one present on screen is used. */
  target: string | string[];
  title: string;
  body: string;
  action: string;
  founderNote: string;
  /** Data scenario established on entry so jumping to any step is deterministic. */
  scenario: Scenario;
  ui?: Partial<UiState>;
  script?: (ctx: TourCtx) => void;
  next?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'home-alert',
    route: '/',
    target: 'ai-alert',
    title: 'AI is already changing how customers order.',
    body: 'Diners can discover and order from restaurants through external channels. Without a connected loyalty journey, the merchant may lose the chance to recognize and retain them.',
    action: 'Highlights the new AI-order alert and its Explore AI Channels action.',
    founderNote: 'Make an emerging distribution shift visible inside the merchant’s existing workflow.',
    scenario: 'baseline',
    ui: { bannerDismissed: false },
    script: (c) => c.at(1600, () => c.setTarget('ai-alert-cta')),
  },
  {
    id: 'discover',
    route: '/ai-channels/overview',
    target: ['nav-ai-channels', 'overview-heading'],
    title: 'One place to understand AI demand.',
    body: 'Beacon gives merchants a single view of AI-attributed orders, the channels driving them, and the customer relationships those orders create.',
    action: 'Opens AI Channels → Overview.',
    founderNote: 'Position Per Diem as the relationship layer for restaurant commerce, not just a branded ordering destination.',
    scenario: 'baseline',
    script: (c) => c.at(1800, () => c.setTarget('overview-kpis')),
  },
  {
    id: 'exposure',
    route: '/ai-channels/overview',
    target: 'kpi-risk',
    title: 'Make the cost of inaction tangible.',
    body: 'See the order volume, customer-match rate, and estimated economic exposure. Measured order value is kept separate from modeled recoverable revenue.',
    action: 'Opens the revenue-at-risk methodology.',
    founderNote: 'Give merchants a concrete reason to activate Beacon and a credible foundation for premium-tier value.',
    scenario: 'baseline',
    script: (c) =>
      c.at(1400, () => {
        c.setUi({ metricDrawer: 'risk' });
        c.setTarget('metric-drawer');
      }),
  },
  {
    id: 'lost-loyalty',
    route: '/ai-channels/overview',
    target: 'recent-orders',
    title: 'An order is not yet a relationship.',
    body: 'The merchant can see AI-channel orders and identify which customers may be matchable, but those orders are not currently contributing to loyalty.',
    action: 'Opens Maya R.’s ChatGPT order and its loyalty status.',
    founderNote: 'Make the gap understandable at the order level rather than relying on abstract market commentary.',
    scenario: 'baseline',
    script: (c) =>
      c.at(1500, () => {
        c.setUi({ orderDrawerId: MAYA.aiOrderId });
        c.setTarget('order-drawer');
      }),
  },
  {
    id: 'diagnose',
    route: '/ai-channels/visibility',
    target: 'visibility-score',
    title: 'Help customers find the right storefront.',
    body: 'Incomplete descriptions, missing dietary tags, and outdated operating information can make a merchant harder to represent accurately in AI-assisted discovery.',
    action: 'Opens Visibility and reveals the audit issues.',
    founderNote: 'Create a practical entry point for merchants and a potential free-audit acquisition channel.',
    scenario: 'baseline',
    script: (c) =>
      c.at(1700, () => {
        c.setUi({ expandedIssue: 'descriptions' });
        c.setTarget('audit-list');
      }),
  },
  {
    id: 'discovery',
    route: '/ai-channels/visibility',
    target: 'discovery-panel',
    title: 'See what a customer might discover.',
    body: 'Preview illustrative discovery results and the information gaps that could influence them. This prototype simulates assistant responses rather than querying live assistants.',
    action: 'Selects “Best oat latte in Williamsburg” and shows the simulated result.',
    founderNote: 'Connect menu quality to an observable merchant workflow without overstating what an audit can prove.',
    scenario: 'baseline',
    ui: { discoveryQuery: 'vegan' },
    script: (c) => c.at(700, () => c.setUi({ discoveryQuery: 'oat' })),
  },
  {
    id: 'olivia',
    route: '/ai-channels/visibility',
    target: 'fix-descriptions',
    title: 'Turn insights into action.',
    body: 'Olivia suggests richer item descriptions and relevant menu attributes. Review the changes, apply them to the mock data, and watch the illustrative visibility score improve.',
    action: 'Opens Olivia, then applies the prepared demo fix set: descriptions, dietary tags, holiday hours, signature items.',
    founderNote: 'Extend the value of Olivia by turning AI-assisted content improvements into a connected product workflow.',
    scenario: 'baseline',
    ui: { expandedIssue: 'descriptions', discoveryQuery: 'oat' },
    script: (c) => {
      c.at(1300, () => {
        c.setUi({ oliviaIssue: 'descriptions' });
        c.setTarget('olivia-drawer');
      });
      c.at(5200, () => {
        c.dispatch({ type: 'applyDescriptions', edits: demoDescriptionEdits(c.getDemo().menu) });
        c.setUi({ oliviaIssue: null, expandedIssue: null });
        c.toast(SYNC_TOAST);
        c.setTarget('visibility-score');
      });
      c.at(6300, () => c.dispatch({ type: 'applyDietary', edits: demoDietaryEdits(c.getDemo().menu) }));
      c.at(7200, () => c.dispatch({ type: 'applyHoliday', hours: HOLIDAY_SUGGESTIONS }));
      c.at(8100, () => {
        c.dispatch({ type: 'applySignature', ids: SIGNATURE_SUGGESTIONS });
        c.toast({ title: 'Demo fix set applied', body: 'Score now 86 — Strong. Simulated discovery rank updated.' });
      });
    },
  },
  {
    id: 'bridge',
    route: '/ai-channels/loyalty-bridge',
    target: 'bridge-toggle',
    title: 'Make eligible AI orders count.',
    body: 'Configure identity matching, rewards, and follow-up messaging so eligible orders can lead into the merchant’s existing loyalty experience.',
    action: 'Enables the mock Loyalty Bridge, then previews the SMS and branded app screen. Nothing is sent.',
    founderNote: 'Create a natural upsell path for advanced loyalty and CRM capabilities, subject to implementation feasibility.',
    scenario: 'fixed',
    ui: { phoneTab: 'sms' },
    script: (c) => {
      c.at(1300, () => {
        c.dispatch({ type: 'setBridge', patch: { enabled: true } });
        c.toast({ title: 'Loyalty Bridge enabled (demo)', body: 'Eligible AI-channel orders now earn stars in the prototype. No messages are sent.' });
      });
      c.at(2900, () => c.setTarget('phone-preview'));
      c.at(5600, () => c.setUi({ phoneTab: 'app' }));
    },
  },
  {
    id: 'relationship',
    route: `/customers/${MAYA.id}`,
    target: 'maya-timeline',
    title: 'See the relationship come together.',
    body: 'Follow an illustrative journey from AI-assisted discovery to an order, an eligible loyalty reward, and an app visit attributed to that order.',
    action: 'Opens Maya R.’s profile and expands the loyalty reward entry.',
    founderNote: 'Demonstrate a concrete customer outcome, not merely an additional reporting dashboard.',
    scenario: 'bridged',
    script: (c) => c.at(1300, () => c.setUi({ expandedTimeline: 'reward' })),
  },
  {
    id: 'results',
    route: '/ai-channels/results',
    target: 'results-compare',
    title: 'Turn a new channel into a retention opportunity.',
    body: 'Beacon connects discovery, merchant data quality, eligible loyalty rewards, and app engagement in one coherent workflow.',
    action: 'Opens Results with the illustrative 30-day outcome.',
    founderNote: 'The strategic bet is to help merchants retain customer relationships even when discovery and ordering happen outside Per Diem’s own app.',
    scenario: 'bridged',
    script: (c) => c.at(3200, () => c.setTarget('results-closing')),
  },
];
