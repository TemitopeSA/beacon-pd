import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Circle, Radar } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ASSUMPTIONS } from '../data/seed';
import { fmtMoney, fmtNum, fmtPct, isEligible, ordersInRange, outcome, weeklySeries } from '../lib/metrics';
import { INITIAL_SCORE, scoreStatus, visibilityScore } from '../lib/visibility';
import { useStore } from '../state/store';
import { Badge, Button, Card, CountUp, PageHeader, cx } from '../components/ui';

const tip = { borderRadius: 10, border: '1px solid #e7e9ee', fontSize: 12 };
const axis = { tickLine: false, axisLine: false, fontSize: 11, tick: { fill: '#6b7280' } } as const;

export function ResultsPage() {
  const { demo } = useStore();
  const navigate = useNavigate();
  const cfg = demo.bridge;
  const out = outcome(cfg);
  const score = visibilityScore(demo);
  const weeks = useMemo(() => weeklySeries(12), []);

  const participation = useMemo(() => {
    const all = ordersInRange(28);
    return [3, 2, 1, 0].map((w) => {
      const wk = all.filter((o) => o.dayIndex >= w * 7 && o.dayIndex < w * 7 + 7);
      return { label: w === 0 ? 'This week' : `${w} wk ago`, before: 0, after: cfg.enabled ? Math.round((wk.filter((o) => isEligible(o, cfg)).length / wk.length) * 100) : 0 };
    });
  }, [cfg]);

  const rows = [
    { label: 'AI orders earning loyalty', before: 0, after: out.loyaltyPct * 100, fmt: (n: number) => `${Math.round(n)}%`, note: 'Share of AI orders in the period that were eligible and rewarded' },
    { label: 'AI-attributed app installations', before: 0, after: out.installs, fmt: (n: number) => fmtNum(n), note: 'Installs opened via a follow-up link within 24h of an AI order' },
    { label: 'AI visibility score', before: INITIAL_SCORE, after: score, fmt: (n: number) => `${Math.round(n)}`, note: `Simulated audit · ${scoreStatus(score).label}` },
    { label: 'Estimated monthly recaptured revenue', before: 0, after: out.revenueCents, fmt: (n: number) => fmtMoney(n), note: 'Modeled repeat orders from reconnected customers' },
  ];

  const changes = [
    ...demo.fixes.map((f) => ({ done: true, text: f.summary, effect: 'Visibility' })),
    { done: cfg.enabled, text: cfg.enabled ? 'Enabled Loyalty Bridge with high-confidence matching' : 'Loyalty Bridge is off', effect: 'Loyalty & installs' },
    { done: cfg.enabled && cfg.followUp, text: cfg.followUp ? `Follow-up ${cfg.followUpChannel === 'push' ? 'push' : 'SMS'} with app link (preview only)` : 'Follow-up messages are off', effect: 'App installs' },
  ];
  const incomplete = !cfg.enabled || score < 86;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="blue">Beacon</Badge>}
        title="Beacon Results"
        subtitle="See what happens when AI-discovered orders become part of your customer relationship."
        actions={<Badge tone="violet" className="px-2.5 py-1 text-[13px]">Illustrative 30-day outcome</Badge>}
      />

      {incomplete && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] text-amber-900">
          <span className="flex-1">
            This outcome reflects your current configuration.
            {!cfg.enabled && ' Loyalty Bridge is off, so no AI orders earn loyalty.'}
            {score < 86 && ' Some visibility fixes haven’t been applied yet.'}
          </span>
          {score < 86 && <Button size="sm" onClick={() => navigate('/ai-channels/visibility')}>Open Visibility</Button>}
          {!cfg.enabled && <Button size="sm" variant="primary" onClick={() => navigate('/ai-channels/loyalty-bridge')}>Enable Loyalty Bridge</Button>}
        </div>
      )}

      <Card data-tour="results-compare" className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-line bg-gray-50 px-5 py-2.5 text-xs font-medium text-muted sm:gap-x-12">
          <span>Metric</span>
          <span className="w-16 text-right sm:w-24">Before</span>
          <span className="w-20 text-right sm:w-28">After</span>
        </div>
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-line px-5 py-4 last:border-0 sm:gap-x-12">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.label}</div>
              <div className="text-xs text-muted">{r.note}</div>
            </div>
            <div className="tabular w-16 text-right text-lg text-subtle sm:w-24">{r.fmt(r.before)}</div>
            <div className={cx('tabular w-20 text-right text-2xl font-semibold sm:w-28', r.after > r.before ? 'text-emerald-700' : 'text-ink')}>
              <CountUp value={r.after} from={r.before} format={r.fmt} duration={1200} />
            </div>
          </div>
        ))}
      </Card>
      <p className="mt-2 text-xs text-muted">
        Loyalty % covers eligible AI orders in the illustrative 30-day period ({fmtNum(out.overview.eligible)} of {fmtNum(out.overview.aiOrders)}). Installs assume {fmtPct(ASSUMPTIONS.outcomeInstallRate, 1)} of rewarded customers open the app; revenue assumes {fmtPct(ASSUMPTIONS.outcomeRepeatRate, 0)} place a repeat order at {fmtMoney(out.overview.avgCents, 2)}. Not a verified business result.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="AI-channel order volume" sub="Weekly, last 12 weeks">
          <BarChart data={weeks}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" {...axis} interval={2} />
            <YAxis {...axis} width={32} />
            <Tooltip contentStyle={tip} cursor={{ fill: '#f3f4f6' }} formatter={(v) => [fmtNum(Number(v)), 'AI orders']} labelFormatter={(_, p) => (p?.[0] ? `Week of ${p[0].payload.range}` : '')} />
            <Bar dataKey="ai" fill="#2453f0" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Identity-match rate" sub="High-confidence matches, weekly">
          <LineChart data={weeks}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" {...axis} interval={2} />
            <YAxis {...axis} width={36} domain={[0.4, 0.8]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <Tooltip contentStyle={tip} formatter={(v) => [fmtPct(Number(v), 0), 'Matched']} labelFormatter={(_, p) => (p?.[0] ? `Week of ${p[0].payload.range}` : '')} />
            <Line type="monotone" dataKey="matchRate" stroke="#2453f0" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Loyalty participation" sub="% of AI orders earning loyalty · before vs. with Beacon">
          <BarChart data={participation}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={tip} cursor={{ fill: '#f3f4f6' }} formatter={(v, n) => [`${v}%`, n === 'before' ? 'Before' : 'With Beacon']} />
            <Bar dataKey="before" fill="#d1d5db" radius={[3, 3, 0, 0]} minPointSize={2} />
            <Bar dataKey="after" fill="#059669" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Attributed app installations" sub="Cumulative over the illustrative 30 days">
          <AreaChart data={out.ramp}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="day" {...axis} tickFormatter={(d) => `D${d}`} interval={6} />
            <YAxis {...axis} width={36} />
            <Tooltip contentStyle={tip} formatter={(v) => [fmtNum(Number(v)), 'Installs']} labelFormatter={(d) => `Day ${d}`} />
            <Area type="monotone" dataKey="installs" stroke="#2453f0" fill="#dce6ff" strokeWidth={2} />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Estimated recaptured revenue" sub="Cumulative, modeled">
          <AreaChart data={out.ramp}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="day" {...axis} tickFormatter={(d) => `D${d}`} interval={6} />
            <YAxis {...axis} width={44} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={tip} formatter={(v) => [fmtMoney(Number(v) * 100), 'Recaptured']} labelFormatter={(d) => `Day ${d}`} />
            <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
          </AreaChart>
        </ChartCard>
        <Card className="p-5">
          <div className="text-[15px] font-semibold">What changed</div>
          <p className="text-[13px] text-muted">Actions that contributed to this outcome</p>
          <ul className="mt-3 space-y-2">
            {changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                {c.done ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-gray-300" />}
                <span className={cx('flex-1', !c.done && 'text-muted')}>{c.text}</span>
                <span className="text-xs whitespace-nowrap text-subtle">{c.effect}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section data-tour="results-closing" className="mt-6 rounded-2xl border border-line bg-white px-6 py-8 text-center shadow-card sm:px-10">
        <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Radar className="size-5" />
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-xl leading-snug font-semibold tracking-[-0.01em] sm:text-2xl">
          AI assistants become a new acquisition channel for Per Diem merchants, not a leak.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
          Beacon helps merchants turn external discovery into measurable customer relationships, repeat orders, and loyalty engagement.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('/ai-channels/overview')}>Back to Overview</Button>
          <Button variant="primary" onClick={() => navigate('/ai-channels/loyalty-bridge')}>
            Review Loyalty Bridge <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactElement }) {
  return (
    <Card className="p-5">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="text-[13px] text-muted">{sub}</p>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
