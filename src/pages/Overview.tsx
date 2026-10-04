import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Filter, Store, X, ShieldCheck, Link2 } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DATA } from '../data/generate';
import { ASSUMPTIONS, CHANNEL_BY_ID, LOCATIONS, MENU_SEED } from '../data/seed';
import type { AIOrder, DateRange } from '../data/types';
import { fmtDateTime, fmtMoney, fmtNum, fmtPct, isEligible, loyaltyState, ordersInRange, overview, projection, starsFor, weeklySeries } from '../lib/metrics';
import { useStore, type MetricKind } from '../state/store';
import { Badge, Button, Card, CardHeader, CountUp, Drawer, InfoTip, PageHeader, ProgressBar, Segmented, cx } from '../components/ui';
import { ChannelBadge, LoyaltyBadge, MatchBadge, itemsLabel } from '../components/domain';

export function RangeSelect() {
  const { demo, dispatch } = useStore();
  return (
    <Segmented<DateRange>
      label="Date range"
      value={demo.dateRange}
      onChange={(r) => dispatch({ type: 'setDateRange', range: r })}
      options={[
        { value: 7, label: '7 days' },
        { value: 30, label: '30 days' },
        { value: 90, label: '90 days' },
      ]}
    />
  );
}

function customerLabel(o: AIOrder) {
  if (o.match.customerId) return DATA.customerById[o.match.customerId].name;
  if (o.match.status === 'ambiguous') return `${o.match.candidates} possible matches`;
  return 'Unknown guest';
}

export function OverviewPage() {
  const { demo, ui, setUi } = useStore();
  const ov = overview(demo.dateRange, demo.bridge);
  const weeks = useMemo(() => weeklySeries(12), []);
  const loc = LOCATIONS.find((l) => l.id === demo.locationId)!;
  const locCount = ordersInRange(demo.dateRange).filter((o) => o.locationId === loc.id).length;
  const tableRef = useRef<HTMLDivElement>(null);
  const channelsRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(40);

  const rows = useMemo(
    () => ordersInRange(demo.dateRange).filter((o) => !ui.channelFilter || o.channel === ui.channelFilter),
    [demo.dateRange, ui.channelFilter],
  );
  const maxCh = Math.max(...ov.byChannel.map((c) => c.orders));
  const scrollTo = (r: React.RefObject<HTMLDivElement | null>) => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const periodWord = demo.dateRange === 30 ? 'month' : `${demo.dateRange} days`;

  const kpis = [
    {
      id: 'kpi-orders',
      label: 'AI orders',
      value: <CountUp value={ov.aiOrders} format={fmtNum} from={0} />,
      sub: (
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <ArrowUpRight className="size-3.5" />
          {Math.round(ov.changePct * 100)}% vs. previous {demo.dateRange} days
        </span>
      ),
      tip: 'Orders whose source is attributed to an AI assistant or AI-assisted marketplace. Attribution depends on order-source data from the ordering integration (an assumption in this prototype).',
      onClick: () => scrollTo(trendRef),
    },
    {
      id: 'kpi-share',
      label: 'Share of orders',
      value: <CountUp value={ov.share * 100} format={(n) => `${n.toFixed(1)}%`} from={0} />,
      sub: `of ${fmtNum(ov.totalOrders)} total orders`,
      tip: 'AI-attributed orders divided by all orders across app, web, and AI channels in the selected period.',
      onClick: () => scrollTo(channelsRef),
    },
    {
      id: 'kpi-match',
      label: 'Matched customers',
      value: <CountUp value={ov.matchedRate * 100} format={(n) => `${Math.round(n)}%`} from={0} />,
      sub: `${fmtNum(ov.matched)} orders matched to existing records`,
      tip: 'Orders matched to an existing customer record with high confidence using the phone or email on the order. Unmatched and ambiguous orders are never attributed.',
      onClick: () => setUi({ metricDrawer: 'match' }),
    },
    {
      id: 'kpi-risk',
      label: 'Estimated revenue at risk',
      value: <CountUp value={ov.atRiskCents} format={(n) => fmtMoney(n)} from={0} />,
      sub: demo.bridge.enabled ? 'AI order value not yet connected to loyalty' : 'AI order value with no loyalty connection',
      tip: 'Measured AI order value in the period that is not connected to your loyalty program. This is exposure, not recovered revenue. See methodology.',
      onClick: () => setUi({ metricDrawer: 'risk' }),
    },
  ];

  return (
    <>
      <PageHeader
        tourId="overview-heading"
        eyebrow={<Badge tone="blue">Beacon</Badge>}
        title="AI Channels"
        subtitle="Understand AI-driven demand, reconnect customers, and measure the value recovered."
        actions={<RangeSelect />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Store className="size-4" />
        All 3 locations · {loc.name}: {fmtNum(locCount)} of {fmtNum(ov.aiOrders)} AI orders
        <span className="text-subtle">·</span>
        <span>Illustrative prototype data</span>
      </div>

      <div data-tour="overview-kpis" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.id} data-tour={k.id} className="group relative p-4 transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(16,24,40,0.12)]">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              {k.label}
              <span className="relative z-10 inline-flex"><InfoTip text={k.tip} label={`About ${k.label}`} /></span>
              <ChevronRight className="ml-auto size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1.5 text-[26px] font-semibold tracking-tight">{k.value}</div>
            <div className="mt-1 text-xs text-muted">{k.sub}</div>
            <button className="absolute inset-0 rounded-xl" aria-label={`Open ${k.label} details`} onClick={k.onClick} />
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card ref={trendRef} className="scroll-mt-20 lg:col-span-2">
          <CardHeader title="Order trends" subtitle="Weekly orders, last 12 weeks · current week in progress" />
          <div className="h-72 px-2 pt-3 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#6b7280' }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis yAxisId="ai" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#6b7280' }} width={36} />
                <YAxis yAxisId="app" orientation="right" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} width={40} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e7e9ee', fontSize: 12 }}
                  labelFormatter={(_, p) => (p?.[0]?.payload ? `Week of ${p[0].payload.range}${p[0].payload.partial ? ' (in progress)' : ''}` : '')}
                  formatter={(v, n) => [fmtNum(Number(v)), n]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Line yAxisId="ai" type="monotone" dataKey="ai" name="AI-channel orders (left axis)" stroke="#2453f0" strokeWidth={2.25} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                <Line yAxisId="app" type="monotone" dataKey="app" name="Branded app orders (right axis)" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card ref={channelsRef} className="scroll-mt-20">
          <CardHeader
            title="Channel breakdown"
            subtitle={`Select a channel to filter orders · last ${demo.dateRange} days`}
            action={ui.channelFilter && <Button size="sm" variant="ghost" onClick={() => setUi({ channelFilter: null })}>Clear</Button>}
          />
          <ul className="space-y-1 px-3 pt-3 pb-4">
            {ov.byChannel.map((c) => {
              const active = ui.channelFilter === c.id;
              const dim = ui.channelFilter && !active;
              return (
                <li key={c.id}>
                  <button
                    aria-pressed={active}
                    onClick={() => {
                      setUi({ channelFilter: active ? null : c.id });
                      setLimit(40);
                    }}
                    className={cx('w-full rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-gray-50', active && 'bg-brand-50/70 ring-1 ring-brand-200', dim && 'opacity-55')}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="tabular text-muted">
                        <span className="font-semibold text-ink">{fmtNum(c.orders)}</span> · {fmtPct(c.orders / Math.max(1, ov.aiOrders), 0)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={cx('h-full rounded-full transition-[width] duration-500', active || !ui.channelFilter ? 'bg-brand-600' : 'bg-brand-300')} style={{ width: `${(c.orders / maxCh) * 100}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">{fmtMoney(c.revenueCents)} order value</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card ref={tableRef} data-tour="recent-orders" className="mt-4 scroll-mt-20">
        <CardHeader
          title="Recent AI orders"
          subtitle={`${fmtNum(rows.length)} orders · last ${periodWord === 'month' ? '30 days' : periodWord}${ui.channelFilter ? ` · ${CHANNEL_BY_ID[ui.channelFilter].label}` : ''}`}
          action={
            ui.channelFilter ? (
              <button onClick={() => setUi({ channelFilter: null })} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                <Filter className="size-3" /> {CHANNEL_BY_ID[ui.channelFilter].short} <X className="size-3" />
              </button>
            ) : undefined
          }
        />
        <div className="scrollbar-thin mt-3 max-h-[480px] overflow-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="sticky top-0 z-[1] bg-gray-50 text-left text-xs font-medium text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Order time</th>
                <th className="py-2 font-medium">Channel</th>
                <th className="py-2 font-medium">Items</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2 pl-6 font-medium">Customer</th>
                <th className="py-2 font-medium">Identity match</th>
                <th className="py-2 pr-5 font-medium">Loyalty</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((o) => (
                <tr
                  key={o.id}
                  tabIndex={0}
                  onClick={() => setUi({ orderDrawerId: o.id })}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setUi({ orderDrawerId: o.id }))}
                  className="cursor-pointer border-t border-line transition-colors hover:bg-gray-50 focus:bg-brand-50/40 focus:outline-none"
                >
                  <td className="py-2.5 pl-5 whitespace-nowrap text-gray-600">{fmtDateTime(o.placedAt)}</td>
                  <td className="py-2.5"><ChannelBadge id={o.channel} short /></td>
                  <td className="max-w-[240px] truncate py-2.5 text-gray-700">{itemsLabel(o.lines)}</td>
                  <td className="tabular py-2.5 text-right">{fmtMoney(o.totalCents, 2)}</td>
                  <td className={cx('py-2.5 pl-6 whitespace-nowrap', o.match.customerId ? 'font-medium' : 'text-muted')}>{customerLabel(o)}</td>
                  <td className="py-2.5"><MatchBadge status={o.match.status} /></td>
                  <td className="py-2.5 pr-5"><LoyaltyBadge state={loyaltyState(o, demo.bridge)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {limit < rows.length && (
            <div className="border-t border-line p-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 60)}>
                Show more ({fmtNum(rows.length - limit)} remaining)
              </Button>
            </div>
          )}
        </div>
      </Card>

      <OrderDrawer />
      <MetricDrawer />
    </>
  );
}

// ---- Order detail -----------------------------------------------------------------------------

export function OrderDrawer() {
  const { demo, ui, setUi, toast } = useStore();
  const navigate = useNavigate();
  const o = ui.orderDrawerId ? DATA.orderById[ui.orderDrawerId] : null;
  const close = () => setUi({ orderDrawerId: null });
  if (!o) return <Drawer open={false} onClose={close} title="">{null}</Drawer>;
  const cust = o.match.customerId ? DATA.customerById[o.match.customerId] : null;
  const state = loyaltyState(o, demo.bridge);
  const stars = starsFor(o.totalCents, demo.bridge, true);
  const loc = LOCATIONS.find((l) => l.id === o.locationId)!;
  const evidenceLabel = { phone: 'Phone number on order', email: 'Email on order', both: 'Phone and email on order' } as const;

  return (
    <Drawer
      open
      onClose={close}
      tourId="order-drawer"
      title={`Order ${o.number}`}
      subtitle={`${fmtDateTime(o.placedAt)} · ${loc.label}`}
      footer={
        <>
          <Button onClick={close}>Close</Button>
          {cust && (
            <Button variant="primary" onClick={() => { close(); navigate(`/customers/${cust.id}`); }}>
              View customer profile
            </Button>
          )}
          {!cust && o.match.status === 'ambiguous' && (
            <Button variant="primary" onClick={() => toast({ title: 'Added to review queue (prototype)', body: 'No reward is issued until a team member confirms the customer.', tone: 'info' })}>
              Add to review queue
            </Button>
          )}
        </>
      }
    >
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Order source</h3>
        <div className="mt-2 flex items-center gap-2">
          <ChannelBadge id={o.channel} />
          <span className="text-xs text-muted">Attributed via order-source metadata (integration assumption)</span>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Items</h3>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {o.lines.map((l) => {
            const m = MENU_SEED.find((x) => x.id === l.itemId)!;
            return (
              <li key={l.itemId} className="flex justify-between px-3 py-2 text-sm">
                <span>{l.qty > 1 && `${l.qty}× `}{m.name}</span>
                <span className="tabular text-muted">{fmtMoney(m.priceCents * l.qty, 2)}</span>
              </li>
            );
          })}
          <li className="flex justify-between bg-gray-50 px-3 py-2 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular">{fmtMoney(o.totalCents, 2)}</span>
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Identity match</h3>
        <div className="mt-2 rounded-lg border border-line p-3">
          <div className="flex items-center justify-between">
            <MatchBadge status={o.match.status} />
            {o.match.confidence > 0 && <span className="tabular text-xs text-muted">Confidence {Math.round(o.match.confidence * 100)}%</span>}
          </div>
          {o.match.status !== 'guest' && <ProgressBar className="mt-2" value={o.match.confidence} tone={o.match.status === 'matched' ? 'brand' : 'gray'} />}
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Evidence</dt>
              <dd>{o.match.evidence ? evidenceLabel[o.match.evidence] : 'No phone or email shared'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Customer</dt>
              <dd className="font-medium">{cust ? `${cust.name} · ${cust.phoneMasked}` : customerLabel(o)}</dd>
            </div>
            {cust && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Loyalty member</dt>
                <dd>{cust.loyaltyMember ? `Yes · ${cust.stars} stars` : 'No'}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-muted">
            {o.match.status === 'matched' && 'High-confidence match against an existing record. Matching relies on contact details shared with the order and authorized data access.'}
            {o.match.status === 'probable' && 'Below the high-confidence threshold. Not rewarded automatically.'}
            {o.match.status === 'ambiguous' && 'The phone number belongs to more than one customer record. Beacon never awards rewards for ambiguous matches automatically.'}
            {o.match.status === 'guest' && 'Anonymous order — it cannot be attributed to a named customer.'}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Loyalty</h3>
        <div className={cx('mt-2 rounded-lg p-3', state === 'pending' ? 'bg-amber-50' : state === 'rewarded' ? 'bg-emerald-50' : 'bg-gray-50')}>
          <LoyaltyBadge state={state} />
          <p className="mt-2 text-[13px] text-gray-700">
            {state === 'pending' && `Eligible for ${stars} stars, but AI-channel orders don’t earn loyalty yet. This customer’s visit isn’t counted toward their rewards or streak.`}
            {state === 'rewarded' && `${stars} stars recorded in the prototype’s loyalty ledger (simulated — no real transaction).`}
            {state === 'review' && 'Held for manual review before any reward is issued.'}
            {state === 'not_enrolled' && 'Not connected to a loyalty account.'}
          </p>
          {state === 'pending' && (
            <Button size="sm" variant="primary" className="mt-3" icon={<Link2 className="size-3.5" />} onClick={() => { close(); navigate('/ai-channels/loyalty-bridge'); }}>
              Set up Loyalty Bridge
            </Button>
          )}
        </div>
      </section>
    </Drawer>
  );
}

// ---- Metric explanation -----------------------------------------------------------------------

export function MetricDrawer() {
  const { demo, ui, setUi } = useStore();
  const navigate = useNavigate();
  const kind: MetricKind | null = ui.metricDrawer;
  const ov = overview(demo.dateRange, demo.bridge);
  const proj = projection(demo.bridge);
  const close = () => setUi({ metricDrawer: null });
  const elig = ordersInRange(demo.dateRange).filter((o) => isEligible(o, demo.bridge)).length;

  return (
    <Drawer
      open={!!kind}
      onClose={close}
      tourId="metric-drawer"
      icon={<span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><ShieldCheck className="size-5" /></span>}
      title={kind === 'risk' ? 'Estimated revenue at risk' : 'Matched customers'}
      subtitle={`Last ${demo.dateRange} days · methodology`}
      footer={
        <>
          <Button onClick={close}>Close</Button>
          <Button variant="primary" onClick={() => { close(); navigate('/ai-channels/loyalty-bridge'); }}>
            Review Loyalty Bridge
          </Button>
        </>
      }
    >
      {kind === 'risk' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line p-3">
              <div className="text-xs text-muted">Measured AI order value</div>
              <div className="tabular mt-1 text-xl font-semibold">{fmtMoney(ov.revenueCents)}</div>
              <div className="mt-0.5 text-xs text-muted">{fmtNum(ov.aiOrders)} orders × {fmtMoney(ov.avgCents, 2)} avg.</div>
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="text-xs text-muted">Not connected to loyalty</div>
              <div className="tabular mt-1 text-xl font-semibold">{fmtMoney(ov.atRiskCents)}</div>
              <div className="mt-0.5 text-xs text-muted">{fmtNum(ov.aiOrders - ov.rewarded)} orders without a loyalty link</div>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
            <strong className="font-semibold">At risk is not lost, and not recovered.</strong> It’s order value this period where the customer relationship isn’t being reinforced. Only part of it is realistically recoverable.
          </div>
          <div>
            <h3 className="text-sm font-semibold">Modeled recoverable portion (monthly)</h3>
            <p className="mt-1 text-[13px] text-muted">Applies only to orders that can be confidently matched and rewarded.</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              <Row k="Eligible, matchable AI orders (30 days)" v={fmtNum(proj.eligible)} />
              <Row k={`Assumed app-install conversion`} v={fmtPct(ASSUMPTIONS.projectedInstallRate, 0)} />
              <Row k="Projected new app customers" v={fmtNum(proj.installs)} />
              <Row k="Assumed repeat orders per new app customer" v={`${ASSUMPTIONS.projectedRepeatOrdersPerInstall} / month`} />
              <Row k="Modeled recoverable revenue" v={`${fmtMoney(proj.revenueCents)} / month`} strong />
            </dl>
          </div>
          <p className="text-xs text-muted">Illustrative estimate using prototype data. Actual outcomes depend on order-source attribution, contact availability, permissions, and customer behavior. Commercial terms differ by channel.</p>
        </div>
      )}
      {kind === 'match' && (
        <div className="space-y-5">
          <div className="rounded-lg border border-line p-3">
            <div className="text-xs text-muted">High-confidence matches</div>
            <div className="tabular mt-1 text-xl font-semibold">{fmtPct(ov.matchedRate, 0)} <span className="text-sm font-normal text-muted">({fmtNum(ov.matched)} of {fmtNum(ov.aiOrders)} orders)</span></div>
          </div>
          <dl className="space-y-2 text-[13px]">
            <Row k="Matched by phone" v={fmtNum(ov.byStatus.matched_phone ?? 0)} />
            <Row k="Matched by email" v={fmtNum(ov.byStatus.matched_email ?? 0)} />
            <Row k="Matched by phone and email" v={fmtNum(ov.byStatus.matched_both ?? 0)} />
            <Row k="Possible match (below threshold)" v={fmtNum(ov.byStatus.probable ?? 0)} />
            <Row k="Ambiguous (multiple records)" v={fmtNum(ov.byStatus.ambiguous ?? 0)} />
            <Row k="No contact info shared" v={fmtNum(ov.byStatus.guest ?? 0)} />
          </dl>
          <p className="text-[13px] text-muted">With your current Loyalty Bridge settings, {fmtNum(elig)} orders would be eligible for rewards. Matching uses only the signals you enable, and only when contact details are shared with the order under applicable permissions.</p>
        </div>
      )}
    </Drawer>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cx('flex justify-between gap-4 border-b border-line pb-2 last:border-0', strong && 'font-semibold')}>
      <dt className={strong ? '' : 'text-muted'}>{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}

