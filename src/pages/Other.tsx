import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ImageOff, Plus, Sparkles, Star, Radar } from 'lucide-react';
import { DATA } from '../data/generate';
import { LOCATIONS, LOYALTY_PROGRAM, MERCHANT, REGULAR_HOURS } from '../data/seed';
import { fmtDateTime, fmtMoney, fmtNum, overview } from '../lib/metrics';
import { auditIssues } from '../lib/visibility';
import { useStore } from '../state/store';
import { Badge, Button, Card, CardHeader, Field, Modal, PageHeader, Segmented, cx, inputCls } from '../components/ui';
import { SourceBadge, itemsLabel } from '../components/domain';
import { OrderDrawer } from './Overview';

// ---- Orders -------------------------------------------------------------------------------------

export function OrdersPage() {
  const { demo, setUi } = useStore();
  const [src, setSrc] = useState<'all' | 'direct' | 'ai'>('all');
  const loc = LOCATIONS.find((l) => l.id === demo.locationId)!;
  const rows = useMemo(() => {
    const direct = DATA.direct.filter((o) => o.locationId === loc.id).map((o) => ({ id: o.id, ai: false, number: o.number, at: o.placedAt, source: o.source as never, items: itemsLabel(o.lines), total: o.totalCents, customer: o.customerId ? DATA.customerById[o.customerId].name : 'Guest' }));
    const ai = DATA.orders.filter((o) => o.dayIndex < 2 && o.locationId === loc.id).map((o) => ({ id: o.id, ai: true, number: o.number, at: o.placedAt, source: o.channel as never, items: itemsLabel(o.lines), total: o.totalCents, customer: o.match.customerId ? DATA.customerById[o.match.customerId].name : 'Unknown guest' }));
    return [...direct, ...ai].filter((r) => src === 'all' || (src === 'ai') === r.ai).sort((a, b) => b.at - a.at);
  }, [loc.id, src]);
  return (
    <>
      <PageHeader title="Orders" subtitle={`${loc.label} · today and yesterday`} actions={<Segmented label="Order source" value={src} onChange={setSrc} options={[{ value: 'all', label: 'All' }, { value: 'direct', label: 'App & web' }, { value: 'ai', label: 'AI channels' }]} />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Order</th>
                <th className="py-2 font-medium">Placed</th>
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Items</th>
                <th className="py-2 pr-5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => r.ai && setUi({ orderDrawerId: r.id })} className={cx('border-t border-line', r.ai && 'cursor-pointer hover:bg-gray-50')}>
                  <td className="py-2.5 pl-5 font-medium">{r.number}</td>
                  <td className="py-2.5 whitespace-nowrap text-gray-600">{fmtDateTime(r.at)}</td>
                  <td className="py-2.5"><SourceBadge source={r.source} /></td>
                  <td className="py-2.5 text-gray-700">{r.customer}</td>
                  <td className="max-w-[260px] truncate py-2.5 text-gray-600">{r.items}</td>
                  <td className="tabular py-2.5 pr-5 text-right">{fmtMoney(r.total, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <OrderDrawer />
    </>
  );
}

// ---- Menu ---------------------------------------------------------------------------------------

export function MenuPage() {
  const { demo, toast } = useStore();
  const open = auditIssues(demo).filter((i) => !i.resolved).length;
  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={`${demo.menu.length} items · synced from ${MERCHANT.pos} (simulated)`}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => toast({ title: 'Items are managed in Square', body: 'New items sync to Per Diem automatically (simulated).', tone: 'info' })}>Add item</Button>}
      />
      {open > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-[13px]">
          <Sparkles className="size-4 text-brand-600" />
          <span className="flex-1">Olivia found {open} ways to improve how your menu appears in AI-assisted discovery.</span>
          <Link to="/ai-channels/visibility" className="font-medium text-brand-700 hover:underline">Review in Visibility</Link>
        </div>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Item</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">Dietary</th>
                <th className="py-2 font-medium">Photo</th>
                <th className="py-2 pr-5 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {demo.menu.map((m) => (
                <tr key={m.id} className="border-t border-line align-top">
                  <td className="py-2.5 pl-5">
                    <div className="flex items-center gap-1.5 font-medium">
                      {m.name}
                      {m.signature && <Star className="size-3.5 fill-amber-400 text-amber-400" aria-label="Signature item" />}
                    </div>
                    <div className="text-xs text-muted">{m.category}</div>
                  </td>
                  <td className={cx('max-w-[360px] py-2.5 text-[13px]', m.description ? 'text-gray-600' : 'text-subtle italic')}>{m.description || 'Missing'}</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">{m.dietary.length ? m.dietary.map((t) => <Badge key={t} tone="green">{t}</Badge>) : <span className="text-xs text-subtle">—</span>}</div>
                  </td>
                  <td className="py-2.5">{m.photo ? <Camera className="size-4 text-gray-500" aria-label="Has photo" /> : <ImageOff className="size-4 text-subtle" aria-label="No photo" />}</td>
                  <td className="tabular py-2.5 pr-5 text-right">{fmtMoney(m.priceCents, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ---- Loyalty ------------------------------------------------------------------------------------

export function LoyaltyPage() {
  const { demo } = useStore();
  const ov = overview(30, demo.bridge);
  const members = DATA.customers.filter((c) => c.loyaltyMember).length;
  return (
    <>
      <PageHeader title="Loyalty" subtitle={`${LOYALTY_PROGRAM.name} · 1 star per $5 · ${LOYALTY_PROGRAM.rewardAt} stars for a ${LOYALTY_PROGRAM.rewardName.toLowerCase()}`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Members" value={fmtNum(members * 7)} sub="All locations" />
        <Stat label="Rewards redeemed (30 days)" value="412" sub="+6% vs. previous 30 days" />
        <Stat label="Avg. visits per member" value="3.1 / mo" sub="Last 90 days" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Earning channels" subtitle="Where members earn stars" />
        <ul className="mt-2 divide-y divide-line border-t border-line text-sm">
          {['Branded app', 'Web ordering', 'In-store (Square POS, by phone)'].map((c) => (
            <li key={c} className="flex items-center justify-between px-5 py-3">
              {c}
              <Badge tone="green" dot>Earning</Badge>
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <span className="flex items-center gap-2">
              <Radar className="size-4 text-brand-600" /> AI channels
              <span className="text-xs text-muted">{fmtNum(ov.eligible)} eligible orders in the last 30 days</span>
            </span>
            <span className="flex items-center gap-3">
              <Badge tone={demo.bridge.enabled ? 'green' : 'gray'} dot>{demo.bridge.enabled ? 'Earning (demo)' : 'Not earning'}</Badge>
              <Link to="/ai-channels/loyalty-bridge" className="text-[13px] font-medium text-brand-700 hover:underline">Manage in Loyalty Bridge</Link>
            </span>
          </li>
        </ul>
      </Card>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="tabular mt-1.5 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </Card>
  );
}

// ---- Marketing ------------------------------------------------------------------------------------

const CAMPAIGNS = {
  push: [
    { name: 'Pumpkin spice is back', status: 'Sent', date: 'Sep 22', reach: '1,842', result: '14.2% open' },
    { name: 'Rainy day double stars', status: 'Sent', date: 'Sep 9', reach: '1,790', result: '11.8% open' },
    { name: 'Weekend cardamom bun drop', status: 'Scheduled', date: 'Oct 10', reach: '1,901', result: '—' },
  ],
  sms: [
    { name: 'We miss you — 2x stars', status: 'Sent', date: 'Sep 28', reach: '2,410', result: '6.1% redeemed' },
    { name: 'Holiday hours reminder', status: 'Draft', date: '—', reach: '—', result: '—' },
  ],
  email: [
    { name: 'October newsletter', status: 'Scheduled', date: 'Oct 6', reach: '5,120', result: '—' },
    { name: 'New fall menu', status: 'Sent', date: 'Sep 15', reach: '5,034', result: '38% open' },
  ],
} as const;

export function MarketingPage({ channel }: { channel: keyof typeof CAMPAIGNS }) {
  const [open, setOpen] = useState(false);
  const title = { push: 'Push Notifications', sms: 'SMS', email: 'Email' }[channel];
  return (
    <>
      <PageHeader title={title} subtitle="Campaigns to your opted-in customers" actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>New campaign</Button>} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Campaign</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 text-right font-medium">Audience</th>
                <th className="py-2 pr-5 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS[channel].map((c) => (
                <tr key={c.name} className="border-t border-line">
                  <td className="py-2.5 pl-5 font-medium">{c.name}</td>
                  <td className="py-2.5"><Badge tone={c.status === 'Sent' ? 'green' : c.status === 'Scheduled' ? 'blue' : 'gray'}>{c.status}</Badge></td>
                  <td className="py-2.5 text-gray-600">{c.date}</td>
                  <td className="tabular py-2.5 text-right">{c.reach}</td>
                  <td className="py-2.5 pr-5 text-right text-gray-600">{c.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} label="New campaign">
        <div className="p-6">
          <h2 className="text-base font-semibold">New {title.toLowerCase()} campaign</h2>
          <p className="mt-2 text-sm text-muted">The campaign builder isn’t part of this concept prototype. Beacon’s AI-order follow-ups are configured in Loyalty Bridge.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Close</Button>
            <Link to="/ai-channels/loyalty-bridge" onClick={() => setOpen(false)}>
              <Button variant="primary">Open Loyalty Bridge</Button>
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function OliviaPage() {
  const { demo, setUi } = useStore();
  const navigate = useNavigate();
  const issues = auditIssues(demo).filter((i) => i.action === 'olivia');
  return (
    <>
      <PageHeader title="Olivia AI" subtitle="Your AI marketing and menu assistant" />
      <Card>
        <CardHeader title="Suggestions" subtitle="From the latest AI Visibility audit" />
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {issues.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <Sparkles className={cx('size-4', i.resolved ? 'text-emerald-600' : 'text-brand-600')} />
              <span className={cx('flex-1', i.resolved && 'text-muted')}>{i.resolved ? i.resolvedTitle : i.title}</span>
              {i.resolved ? (
                <Badge tone="green">Applied</Badge>
              ) : (
                <Button size="sm" variant="primary" onClick={() => { navigate('/ai-channels/visibility'); setUi({ oliviaIssue: i.id }); }}>
                  Review
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ---- Operations -----------------------------------------------------------------------------------

export function HoursPage() {
  const { demo, setUi } = useStore();
  const navigate = useNavigate();
  const loc = LOCATIONS.find((l) => l.id === demo.locationId)!;
  return (
    <>
      <PageHeader title="Operational Times" subtitle={loc.label} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Regular hours" />
          <ul className="mt-2 divide-y divide-line border-t border-line text-sm">
            {REGULAR_HOURS.map((h) => (
              <li key={h.day} className="flex justify-between px-5 py-3">
                <span>{h.day}</span>
                <span className="text-gray-600">{h.hours}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Holiday hours"
            action={!demo.holidayHours && <Button size="sm" variant="primary" icon={<Sparkles className="size-3.5" />} onClick={() => { navigate('/ai-channels/visibility'); setUi({ oliviaIssue: 'holiday' }); }}>Set up with Olivia</Button>}
          />
          {demo.holidayHours ? (
            <ul className="mt-2 divide-y divide-line border-t border-line text-sm">
              {demo.holidayHours.map((h) => (
                <li key={h.id} className="flex justify-between px-5 py-3">
                  <span>{h.name} <span className="text-xs text-muted">· {h.date}</span></span>
                  <span className="text-gray-600">{h.hours}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pt-2 pb-5 text-sm text-muted">No holiday hours configured. Customers and discovery surfaces will see regular hours on holidays.</p>
          )}
        </Card>
      </div>
    </>
  );
}

// ---- Settings -------------------------------------------------------------------------------------

const USERS = [
  { name: MERCHANT.owner, email: MERCHANT.ownerEmail, role: 'Owner', locs: 'All locations' },
  { name: 'Riley Chen', email: 'riley@juniperbean.example', role: 'Manager', locs: 'Williamsburg' },
  { name: 'Sam Okafor', email: 'sam@juniperbean.example', role: 'Manager', locs: 'Greenpoint, Park Slope' },
  { name: 'Dana Park', email: 'dana@juniperbean.example', role: 'Marketing', locs: 'All locations' },
];

export function UsersPage() {
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  return (
    <>
      <PageHeader title="User Management" subtitle="People with access to this dashboard" actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Invite user</Button>} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-5 font-medium">Name</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 pr-5 font-medium">Locations</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.email} className="border-t border-line">
                  <td className="py-2.5 pl-5">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="py-2.5"><Badge tone={u.role === 'Owner' ? 'blue' : 'gray'}>{u.role}</Badge></td>
                  <td className="py-2.5 pr-5 text-gray-600">{u.locs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} label="Invite user">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            setEmail('');
            toast({ title: 'Invite preview created', body: 'No email was sent — this is a prototype.', tone: 'info' });
          }}
        >
          <h2 className="text-base font-semibold">Invite user</h2>
          <div className="mt-4">
            <Field label="Email">
              <input required type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create invite</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

