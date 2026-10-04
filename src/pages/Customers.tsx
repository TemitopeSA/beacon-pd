import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Flame, Lightbulb, Link2, Mail, Phone, Search, Smartphone, Star, UserCheck } from 'lucide-react';
import { DATA, MAYA_APP_ORDER } from '../data/generate';
import { LOCATIONS, LOYALTY_PROGRAM, MAYA } from '../data/seed';
import type { BridgeConfig, Customer } from '../data/types';
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtTime, isEligible } from '../lib/metrics';
import { useStore } from '../state/store';
import { Badge, Button, Card, CardHeader, EmptyNote, PageHeader, ProgressBar, cx, inputCls } from '../components/ui';
import { SourceBadge, itemsLabel } from '../components/domain';
import { mayaScenario, renderTemplate } from './LoyaltyBridge';

const aiOrdersFor = (id: string) => DATA.orders.filter((o) => o.match.customerId === id);

export function CustomersPage() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { demo } = useStore();
  const rows = useMemo(() => {
    const list = DATA.customers.map((c) => {
      const ai = aiOrdersFor(c.id);
      return { c, ai: ai.length, last: Math.max(ai[0]?.placedAt ?? 0, 0) };
    });
    return list
      .filter((r) => r.c.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.c.id === MAYA.id ? -1 : b.c.id === MAYA.id ? 1 : b.ai - a.ai || b.c.directOrders - a.c.directOrders));
  }, [q]);
  const [limit, setLimit] = useState(30);

  return (
    <>
      <PageHeader title="Customers" subtitle={`${fmtNum(DATA.customers.length)} customers across all locations`} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input aria-label="Search customers" placeholder="Search by name" className={cx(inputCls, 'pl-9')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="text-[13px] text-muted">{fmtNum(rows.length)} results</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Customer</th>
                <th className="py-2 font-medium">Home location</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">AI orders</th>
                <th className="py-2 pl-6 font-medium">{LOYALTY_PROGRAM.name}</th>
                <th className="py-2 pr-5 font-medium">App</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map(({ c, ai }) => {
                const maya = c.id === MAYA.id;
                const stars = maya ? mayaScenario(demo.bridge).balance : c.stars;
                const app = maya ? demo.bridge.enabled : c.appInstalled;
                return (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} className="cursor-pointer border-t border-line hover:bg-gray-50">
                    <td className="py-2.5 pl-5">
                      <Link to={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 font-medium hover:text-brand-700">
                        <Avatar name={c.name} size="sm" />
                        {c.name}
                        {maya && <Badge tone="blue">Recently active</Badge>}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-600">{LOCATIONS.find((l) => l.id === c.homeLocationId)?.name}</td>
                    <td className="tabular py-2.5 text-right">{fmtNum(c.directOrders + ai + (maya && demo.bridge.enabled ? 1 : 0))}</td>
                    <td className="tabular py-2.5 text-right">{ai}</td>
                    <td className="py-2.5 pl-6 text-gray-600">{c.loyaltyMember ? `${stars} stars` : <span className="text-subtle">Not a member</span>}</td>
                    <td className="py-2.5 pr-5">{app ? <Badge tone="blue">Installed</Badge> : <span className="text-[13px] text-subtle">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {limit < rows.length && (
            <div className="border-t border-line p-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 50)}>
                Show more
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.replace('.', '').split(' ').map((p) => p[0]).join('');
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800', size === 'sm' ? 'size-7 text-[11px]' : 'size-14 text-lg')}>
      {initials}
    </span>
  );
}

// ---- Timeline model ---------------------------------------------------------------------------

interface TLEvent {
  id: string;
  at: number;
  title: string;
  source: 'app' | 'instore' | 'chatgpt' | 'beacon';
  summary: string;
  details: { k: string; v: string }[];
  illustrative?: boolean;
  tone?: 'green' | 'amber';
  link?: { to: string; label: string };
}

function mayaTimeline(cfg: BridgeConfig): TLEvent[] {
  const s = mayaScenario(cfg);
  const o = s.order;
  const on = cfg.enabled;
  const ev: TLEvent[] = [];
  const at = (m: number) => o.placedAt + m * 60_000;

  ev.push({
    id: 'ai-order',
    at: o.placedAt,
    title: 'AI-channel order detected',
    source: 'chatgpt',
    summary: `${itemsLabel(o.lines)} · ${fmtMoney(o.totalCents, 2)}`,
    details: [
      { k: 'Order', v: `${o.number} · Williamsburg pickup` },
      { k: 'Source', v: 'ChatGPT (attributed via order-source metadata — integration assumption)' },
      { k: 'Contact shared', v: 'Phone number' },
    ],
  });
  ev.push({
    id: 'match',
    at: at(0.5),
    title: 'Identity match confirmed',
    source: 'beacon',
    summary: 'Matched to existing record by phone · 98% confidence',
    details: [
      { k: 'Evidence', v: `Phone ${MAYA.phone} (fictional) matches 1 customer record` },
      { k: 'Rule', v: 'High-confidence matches only' },
      { k: 'Scenario', v: 'Mock identity match — real matching requires authorized data access' },
    ],
  });
  if (on) {
    ev.push({
      id: 'reward',
      at: at(1),
      title: `Loyalty reward recorded: +${s.stars} stars`,
      source: 'beacon',
      tone: 'green',
      summary: `${LOYALTY_PROGRAM.name} balance ${MAYA.startingStars} → ${s.balance} of ${LOYALTY_PROGRAM.rewardAt}${cfg.streakPreservation ? ` · streak extended to ${s.streak} weeks` : ''}`,
      details: [
        { k: 'Calculation', v: `${fmtMoney(o.totalCents, 2)} ÷ $${cfg.spendPerStar} per star = ${Math.floor(o.totalCents / 100 / cfg.spendPerStar)} stars${cfg.firstOrderBonus ? ` + ${cfg.firstOrderBonusStars} first-order bonus` : ''}` },
        { k: 'Ledger', v: 'Simulated transaction in the prototype — no real loyalty system was updated' },
      ],
      illustrative: true,
    });
    if (cfg.followUp)
      ev.push({
        id: 'followup',
        at: at(1.2),
        title: `Follow-up ${cfg.followUpChannel === 'push' ? 'push notification' : 'SMS'} previewed`,
        source: 'beacon',
        summary: cfg.followUpChannel === 'push' ? 'Not deliverable — Maya hasn’t enabled push notifications' : 'Preview only — not sent',
        details: [{ k: 'Message', v: renderTemplate(cfg, s.stars) }],
        illustrative: true,
        link: { to: '/ai-channels/loyalty-bridge', label: 'Edit message' },
      });
    ev.push({
      id: 'app-visit',
      at: at(29),
      title: 'App installed and opened',
      source: 'app',
      summary: 'First app visit attributed to the AI-channel order follow-up',
      details: [
        { k: 'Attribution', v: 'Opened via the demo app link within 24 hours of the ChatGPT order' },
        { k: 'Landing screen', v: `“Welcome back, Maya.” · ${s.stars} stars waiting` },
      ],
      illustrative: true,
    });
    ev.push({
      id: 'app-order',
      at: MAYA_APP_ORDER.placedAt,
      title: 'App order placed',
      source: 'app',
      summary: `${itemsLabel(MAYA_APP_ORDER.lines)} · ${fmtMoney(MAYA_APP_ORDER.totalCents, 2)}`,
      details: [
        { k: 'Order', v: 'Branded app · Williamsburg pickup' },
        { k: 'Loyalty', v: `Earned ${Math.floor(MAYA_APP_ORDER.totalCents / 100 / 5)} stars at app rates (illustrative)` },
      ],
      illustrative: true,
    });
  } else {
    ev.push({
      id: 'reward',
      at: at(1),
      title: 'No loyalty credit recorded',
      source: 'beacon',
      tone: 'amber',
      summary: `Eligible for ${s.stars} stars, but AI-channel orders don’t earn loyalty yet`,
      details: [
        { k: 'Why', v: 'Reward AI-channel orders is off in Loyalty Bridge' },
        { k: 'Effect', v: `Maya’s ${MAYA.startingStreakWeeks}-week streak and star balance don’t reflect this visit` },
      ],
      link: { to: '/ai-channels/loyalty-bridge', label: 'Open Loyalty Bridge' },
    });
  }
  DATA.mayaVisits.forEach((v) =>
    ev.push({
      id: v.id,
      at: v.placedAt,
      title: 'In-store order',
      source: 'instore',
      summary: `${itemsLabel(v.lines)} · ${fmtMoney(v.totalCents, 2)}`,
      details: [
        { k: 'Location', v: 'Williamsburg · Square POS' },
        { k: 'Loyalty', v: `Earned ${Math.floor(v.totalCents / 500)} stars by phone lookup` },
      ],
    }),
  );
  return ev.sort((a, b) => b.at - a.at);
}

function genericTimeline(c: Customer, cfg: BridgeConfig): TLEvent[] {
  return aiOrdersFor(c.id).slice(0, 12).map((o) => ({
    id: o.id,
    at: o.placedAt,
    title: 'AI-channel order',
    source: 'chatgpt' as const,
    summary: `${itemsLabel(o.lines)} · ${fmtMoney(o.totalCents, 2)}`,
    details: [
      { k: 'Channel', v: o.channel },
      { k: 'Match', v: `${o.match.status} · ${Math.round(o.match.confidence * 100)}% confidence` },
      { k: 'Loyalty', v: isEligible(o, cfg) ? (cfg.enabled ? 'Rewarded (simulated)' : 'Eligible — pending') : 'Not eligible' },
    ],
  }));
}

// ---- Profile ------------------------------------------------------------------------------------

export function CustomerProfilePage() {
  const { id = '' } = useParams();
  const { demo, ui, setUi } = useStore();
  const c = DATA.customerById[id];
  const [showAll, setShowAll] = useState(false);
  if (!c) {
    return (
      <>
        <BackLink />
        <EmptyNote>Customer not found.</EmptyNote>
      </>
    );
  }
  const maya = c.id === MAYA.id;
  const cfg = demo.bridge;
  const s = mayaScenario(cfg);
  const events = maya ? mayaTimeline(cfg) : genericTimeline(c, cfg);
  const visible = showAll ? events : events.slice(0, maya ? (cfg.enabled ? 9 : 6) : 8);
  const aiCount = aiOrdersFor(c.id).length;
  const orders = c.directOrders + aiCount + (maya && cfg.enabled ? 1 : 0);
  const spend = c.directSpendCents + aiOrdersFor(c.id).reduce((a, o) => a + o.totalCents, 0) + (maya && cfg.enabled ? MAYA_APP_ORDER.totalCents : 0);
  const stars = maya ? s.balance : c.stars;
  const streak = maya ? s.streak : (c.directOrders % 5) + 1;
  const appInstalled = maya ? cfg.enabled : c.appInstalled;

  const stats = [
    { label: 'Loyalty balance', value: `${stars} / ${LOYALTY_PROGRAM.rewardAt}`, sub: <ProgressBar className="mt-2" value={stars / LOYALTY_PROGRAM.rewardAt} />, icon: Star },
    { label: 'Current streak', value: `${streak} weeks`, sub: maya && !cfg.enabled ? 'AI order not counted' : 'Weekly visits', icon: Flame },
    { label: 'Total orders', value: fmtNum(orders), sub: `${aiCount} via AI channels`, icon: UserCheck },
    { label: 'Lifetime spend', value: fmtMoney(spend, 2), sub: `Since ${c.memberSince}`, icon: Link2 },
    {
      label: 'App',
      value: appInstalled ? 'Installed' : 'Not installed',
      sub: maya ? (cfg.enabled ? `Attributed to ChatGPT order · ${fmtTime(s.order.placedAt + 29 * 60_000)}` : 'No app relationship yet') : appInstalled ? 'Push ' + (c.pushOptIn ? 'on' : 'off') : '—',
      icon: Smartphone,
    },
  ];

  return (
    <>
      <BackLink />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={c.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{c.name}</h1>
            {c.loyaltyMember && <Badge tone="gray">{LOYALTY_PROGRAM.name} member</Badge>}
            {maya && cfg.enabled && <Badge tone="blue">Joined app via AI order</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{maya ? MAYA.phone : c.phoneMasked}</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{maya ? MAYA.email : c.emailMasked}</span>
            <span>Home: {LOCATIONS.find((l) => l.id === c.homeLocationId)?.name}</span>
            <span>SMS {c.smsOptIn ? 'opted in' : 'not opted in'}</span>
          </div>
        </div>
        <span className="text-xs text-subtle">Fictional demo contact details</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((st) => (
          <Card key={st.label} className="p-4">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              <st.icon className="size-3.5" /> {st.label}
            </div>
            <div className="tabular mt-1.5 text-lg font-semibold">{st.value}</div>
            <div className="mt-0.5 text-xs text-muted">{st.sub}</div>
          </Card>
        ))}
      </div>

      {maya && (
        <div className={cx('mt-4 flex gap-3 rounded-xl border p-4', cfg.enabled ? 'border-brand-200 bg-brand-50/60' : 'border-amber-200 bg-amber-50/60')}>
          <Lightbulb className={cx('mt-0.5 size-5 shrink-0', cfg.enabled ? 'text-brand-600' : 'text-amber-600')} />
          <div className="text-sm">
            <div className="font-medium text-ink">Customer insight</div>
            <p className="mt-0.5 text-gray-700">
              {cfg.enabled
                ? 'Maya discovered Juniper & Bean through an AI-assisted order and continued her loyalty journey in the branded app.'
                : 'Maya’s ChatGPT order matched her existing record, but it earned no stars and didn’t count toward her streak. Her relationship with Juniper & Bean isn’t growing from this visit.'}
            </p>
            {!cfg.enabled && (
              <Link to="/ai-channels/loyalty-bridge" className="mt-1.5 inline-block text-[13px] font-medium text-brand-700 hover:underline">
                Set up Loyalty Bridge
              </Link>
            )}
          </div>
        </div>
      )}

      <Card data-tour={maya ? 'maya-timeline' : undefined} className="mt-4">
        <CardHeader title="Activity" subtitle="Orders, loyalty, and messages across every channel" />
        <ol className="px-5 pt-4 pb-3">
          {visible.map((e, i) => {
            const open = ui.expandedTimeline === e.id;
            return (
              <li key={e.id} className="relative flex gap-3 pb-1">
                {i < visible.length - 1 && <span className="absolute top-7 bottom-0 left-[11px] w-px bg-line" aria-hidden />}
                <span
                  className={cx(
                    'relative z-[1] mt-1.5 flex size-[23px] shrink-0 items-center justify-center rounded-full ring-4 ring-white',
                    e.tone === 'green' ? 'bg-emerald-100 text-emerald-700' : e.tone === 'amber' ? 'bg-amber-100 text-amber-700' : e.source === 'beacon' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600',
                  )}
                >
                  <span className="size-2 rounded-full bg-current" />
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    aria-expanded={open}
                    onClick={() => setUi({ expandedTimeline: open ? null : e.id })}
                    className={cx('w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50', open && 'bg-gray-50', e.illustrative && 'border border-dashed border-line-strong')}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{e.title}</span>
                      {e.source === 'beacon' ? <Badge tone="blue">Beacon</Badge> : <SourceBadge source={e.source} />}
                      {e.illustrative && <Badge tone="gray">Illustrative</Badge>}
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted">
                        {fmtDateTime(e.at)}
                        <ChevronDown className={cx('size-3.5 transition-transform', open && 'rotate-180')} />
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-gray-600">{e.summary}</div>
                  </button>
                  {open && (
                    <div className="mx-3 mt-1 mb-2 animate-fade-in rounded-lg border border-line bg-white p-3">
                      <dl className="space-y-1.5 text-[13px]">
                        {e.details.map((d) => (
                          <div key={d.k} className="grid gap-1 sm:grid-cols-[120px_1fr]">
                            <dt className="text-muted">{d.k}</dt>
                            <dd className="text-gray-800">{d.v}</dd>
                          </div>
                        ))}
                      </dl>
                      {e.link && (
                        <Link to={e.link.to} className="mt-2 inline-block text-[13px] font-medium text-brand-700 hover:underline">
                          {e.link.label}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {!visible.length && <EmptyNote>No AI-channel activity for this customer.</EmptyNote>}
        </ol>
        {events.length > visible.length && (
          <div className="border-t border-line p-3 text-center">
            <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>
              Show {events.length - visible.length} earlier events
            </Button>
          </div>
        )}
        {maya && <p className="px-5 pb-4 text-[11px] text-subtle">Events marked Illustrative are generated by the prototype’s simulated Loyalty Bridge scenario. Last visit before today: {fmtDate(DATA.mayaVisits[0].placedAt)}.</p>}
      </Card>
    </>
  );
}

function BackLink() {
  return (
    <Link to="/customers" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" /> Customers
    </Link>
  );
}
