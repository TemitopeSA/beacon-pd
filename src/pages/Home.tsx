import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Radar, X, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DATA, startOfDay } from '../data/generate';
import { LOCATIONS, MENU_SEED, TARGETS } from '../data/seed';
import { overview, fmtMoney, fmtNum, fmtTime } from '../lib/metrics';
import { useStore } from '../state/store';
import { Button, Card, CardHeader, IconButton, PageHeader } from '../components/ui';
import { SourceBadge, itemsLabel } from '../components/domain';

export function useLocationToday() {
  const { demo } = useStore();
  const loc = LOCATIONS.find((l) => l.id === demo.locationId) ?? LOCATIONS[0];
  return useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => 6 - i).map((d) => {
      const point = DATA.daily[d];
      const ai = DATA.orders.filter((o) => o.dayIndex === d && o.locationId === loc.id);
      const direct = Math.round((point.app + point.web) * loc.share);
      const sales = ai.reduce((s, o) => s + o.totalCents, 0) + direct * TARGETS.directAvgTicketCents;
      return {
        label: new Date(startOfDay(d)).toLocaleDateString('en-US', { weekday: 'short' }),
        orders: ai.length + direct,
        ai: ai.length,
        sales: Math.round(sales / 100),
      };
    });
    return { loc, days, today: days[6], yesterday: days[5] };
  }, [loc]);
}

export function HomePage() {
  const { demo, ui, setUi } = useStore();
  const navigate = useNavigate();
  const { loc, days, today, yesterday } = useLocationToday();
  const o30 = overview(30, demo.bridge);

  const topItems = useMemo(() => {
    const counts: Record<string, number> = {};
    DATA.orders.filter((o) => o.dayIndex < 7 && o.locationId === loc.id).forEach((o) => o.lines.forEach((l) => (counts[l.itemId] = (counts[l.itemId] ?? 0) + l.qty)));
    DATA.direct.filter((o) => o.locationId === loc.id).forEach((o) => o.lines.forEach((l) => (counts[l.itemId] = (counts[l.itemId] ?? 0) + l.qty * 3)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ name: MENU_SEED.find((m) => m.id === id)!.name, n }));
  }, [loc.id]);

  const recent = useMemo(
    () =>
      [
        ...DATA.direct.filter((o) => o.locationId === loc.id).map((o) => ({ id: o.id, number: o.number, at: o.placedAt, source: o.source as never, items: itemsLabel(o.lines), total: o.totalCents })),
        ...DATA.orders.filter((o) => o.dayIndex < 2 && o.locationId === loc.id).map((o) => ({ id: o.id, number: o.number, at: o.placedAt, source: o.channel as never, items: itemsLabel(o.lines), total: o.totalCents })),
      ]
        .sort((a, b) => b.at - a.at)
        .slice(0, 6),
    [loc.id],
  );

  const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const stats = [
    { label: 'Net sales today', value: fmtMoney(today.sales * 100), sub: `${delta(today.sales, yesterday.sales) >= 0 ? '+' : ''}${delta(today.sales, yesterday.sales).toFixed(0)}% vs. same time yesterday` },
    { label: 'Orders today', value: fmtNum(today.orders), sub: `${today.ai} via AI channels` },
    { label: 'Avg. ticket', value: fmtMoney((today.sales * 100) / Math.max(1, today.orders), 2), sub: 'All channels' },
    { label: 'Active loyalty members', value: fmtNum(Math.round(DATA.customers.filter((c) => c.loyaltyMember).length * 7.4 * loc.share)), sub: `${loc.name} · Bean Club` },
  ];

  return (
    <>
      <PageHeader title="Good afternoon, Jordan" subtitle={`Here’s what’s happening at ${loc.label} today.`} />

      {!ui.bannerDismissed && (
        <div data-tour="ai-alert" className="mb-6 flex animate-fade-in flex-col gap-4 rounded-xl border border-brand-200 bg-brand-50/70 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-brand-100">
            <Radar className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{fmtNum(o30.aiOrders)} orders came through AI assistants this month.</span>
              <span className="rounded bg-brand-600 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white">NEW</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-600">These customers may not be earning loyalty rewards or connecting with your branded app.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button data-tour="ai-alert-cta" variant="primary" onClick={() => navigate('/ai-channels/overview')}>
              Explore AI Channels <ArrowRight className="size-4" />
            </Button>
            <IconButton label="Dismiss alert" onClick={() => setUi({ bannerDismissed: true })}>
              <X className="size-4" />
            </IconButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-[13px] text-muted">{s.label}</div>
            <div className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs text-muted">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Net sales" subtitle={`Last 7 days · ${loc.name}`} action={<span className="inline-flex items-center gap-1 text-xs text-emerald-700"><TrendingUp className="size-3.5" /> Steady</span>} />
          <div className="h-64 px-2 pt-3 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#6b7280' }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={52} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(v) => [fmtMoney(Number(v) * 100), 'Net sales']} contentStyle={{ borderRadius: 10, border: '1px solid #e7e9ee', fontSize: 12 }} />
                <Bar dataKey="sales" fill="#2453f0" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top items" subtitle="Last 7 days" action={<Link to="/menu" className="text-[13px] font-medium text-brand-700 hover:underline">Menu</Link>} />
          <ul className="px-5 pt-3 pb-4">
            {topItems.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                <span className="w-4 text-xs text-subtle">{i + 1}</span>
                <span className="flex-1 text-sm">{t.name}</span>
                <span className="tabular text-sm text-muted">{fmtNum(t.n)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent orders" subtitle={loc.label} action={<Link to="/orders" className="text-[13px] font-medium text-brand-700 hover:underline">View all orders</Link>} />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2.5 pl-5 font-medium">{r.number}</td>
                  <td className="py-2.5 text-muted">{fmtTime(r.at)}</td>
                  <td className="py-2.5"><SourceBadge source={r.source} /></td>
                  <td className="max-w-[260px] truncate py-2.5 text-gray-600">{r.items}</td>
                  <td className="tabular py-2.5 pr-5 text-right">{fmtMoney(r.total, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
