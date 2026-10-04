# Per Diem Beacon — concept prototype

**Make every AI-discovered order count.**

Beacon is a fully interactive concept prototype of a new **AI Channels** area inside the Per Diem merchant dashboard. It shows a merchant (fictional *Juniper & Bean Coffee*, three Brooklyn locations, Square + Pro Plus) how AI-assistant orders affect their business, how to improve their storefront for AI-assisted discovery, and how to bring eligible AI-channel orders into their loyalty program and branded app.

> Concept prototype — not an official Per Diem product. All data is fictional and deterministic. No network calls are made to Square, Per Diem, OpenAI, Anthropic, Google, or Cash App. Nothing is sent or synced.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

## What's inside

| Screen | Route |
|---|---|
| Home (with AI-order alert) | `/` |
| AI Channels → Overview | `/ai-channels/overview` |
| AI Channels → Visibility | `/ai-channels/visibility` |
| AI Channels → Loyalty Bridge | `/ai-channels/loyalty-bridge` |
| AI Channels → Results | `/ai-channels/results` |
| Customers → Maya R. | `/customers/cus_maya` |

Plus Orders, Menu, Customers, Loyalty, Marketing (Push, SMS, Email, Olivia AI), Operational Times, and User Management.

**Guided tour.** There are 10 steps that drive the real UI: they navigate between screens, open the drawers, apply Olivia's fixes, and turn on the Loyalty Bridge. The tour supports Back, Next, Skip, Escape and Restart. You can jump to any step from the **Guide** button, which also has founder notes and Reset demo.

## Architecture

- `src/data/seed.ts`: merchant, locations, menu, Olivia suggestions, and modeling assumptions.
- `src/data/generate.ts`: a seeded, deterministic generator. It covers 180 days of channel volume and about 1,350 individual AI orders, plus customers and identity matches. The 30-day window is built to hit the snapshot exactly: 590 AI orders (ChatGPT 318, Claude 141, Cash App 96, Gemini 35), $8,732.00 in value (an average of $14.80), 360 high-confidence matches (61%), 4,820 total orders, and +38% month over month.
- `src/lib/metrics.ts`: all KPIs, eligibility, projections, and outcomes are derived from the order data.
- `src/lib/visibility.ts`: a deterministic audit score made of 39 base points, plus a point per described item, a point per tagged dietary item, a point per photo, 5 for holiday hours and 5 for signature items. It starts at 54, reaches 86 after Olivia's fixes, and has a maximum of 100. It also drives the simulated discovery ranking.
- `src/state/store.tsx`: a reducer plus context. Demo data persists to `localStorage`, and Reset demo restores the starting scenario.
- `src/tour/`: the step config (stable `data-tour` targets, scenario, and cancellable scripts), the provider, and the overlay, Guide, and Welcome components.

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide.
