import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Lock, MonitorSmartphone, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { ASSUMPTIONS, LOYALTY_PROGRAM, MAYA, MERCHANT } from '../data/seed';
import { fmtDateTime, fmtMoney, fmtNum, fmtPct, mayaAiOrder, overview, projection, starsFor } from '../lib/metrics';
import { useStore } from '../state/store';
import { AppPreview, PushPreview, SmsPreview } from '../components/domain';
import { Badge, Button, Card, CardHeader, Field, InfoTip, PageHeader, Segmented, Select, Switch, cx, inputCls } from '../components/ui';
import type { BridgeConfig } from '../data/types';

export function renderTemplate(cfg: BridgeConfig, stars: number) {
  return cfg.template
    .replaceAll('{merchant}', MERCHANT.short)
    .replaceAll('{channel}', 'ChatGPT')
    .replaceAll('{stars}', String(stars))
    .replaceAll('{first_name}', 'Maya');
}

export function mayaScenario(cfg: BridgeConfig) {
  const order = mayaAiOrder();
  const stars = starsFor(order.totalCents, cfg, true);
  return {
    order,
    stars,
    balance: MAYA.startingStars + (cfg.enabled ? stars : 0),
    previewBalance: MAYA.startingStars + stars,
    streak: MAYA.startingStreakWeeks + (cfg.enabled && cfg.streakPreservation ? 1 : 0),
    previewStreak: MAYA.startingStreakWeeks + (cfg.streakPreservation ? 1 : 0),
  };
}

export function LoyaltyBridgePage() {
  const { demo, ui, setUi, dispatch, toast } = useStore();
  const cfg = demo.bridge;
  const set = (patch: Partial<BridgeConfig>) => dispatch({ type: 'setBridge', patch });
  const ov = overview(30, cfg);
  const proj = projection(cfg);
  const maya = mayaScenario(cfg);
  const message = renderTemplate(cfg, maya.stars);
  const [assumptions, setAssumptions] = useState(false);
  const segments = Math.ceil(message.length / 160);

  const toggle = (v: boolean) => {
    set({ enabled: v });
    toast(
      v
        ? { title: 'Loyalty Bridge enabled (demo)', body: 'Eligible AI-channel orders now earn stars in the prototype. No messages are sent.' }
        : { title: 'Loyalty Bridge paused', body: 'Your configuration is saved. New AI-channel orders won’t earn stars.', tone: 'info' },
    );
  };

  return (
    <>
      <PageHeader eyebrow={<Badge tone="blue">Beacon</Badge>} title="Loyalty Bridge" subtitle="Connect eligible AI-channel orders to your existing loyalty experience." />

      <Card data-tour="bridge-toggle" className={cx('p-5 transition-colors', cfg.enabled && 'border-emerald-200 bg-emerald-50/30')}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={cx('flex size-10 items-center justify-center rounded-lg', cfg.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
            {cfg.enabled ? <CheckCircle2 className="size-5" /> : <Lock className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="bridge-switch" className="text-[15px] font-semibold">
              Reward AI-channel orders
            </label>
            <p className="text-[13px] text-muted">
              {cfg.enabled
                ? `On · ${fmtNum(ov.eligible)} of ${fmtNum(ov.aiOrders)} AI orders in the last 30 days qualify (${fmtPct(ov.eligible / ov.aiOrders, 0)}).`
                : `Off · AI-channel orders currently earn no ${LOYALTY_PROGRAM.name} stars. ${fmtNum(ov.eligible)} recent orders would qualify.`}
            </p>
          </div>
          <Badge tone={cfg.enabled ? 'green' : 'gray'} dot>
            {cfg.enabled ? 'Active (demo)' : 'Off'}
          </Badge>
          <Switch id="bridge-switch" size="lg" checked={cfg.enabled} onChange={toggle} label="Reward AI-channel orders" />
        </div>
        {cfg.enabled && (
          <div className="mt-4 flex animate-fade-in flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-white px-4 py-3 text-[13px] ring-1 ring-emerald-100">
            <span className="font-medium text-emerald-800">Simulated scenario updated.</span>
            <span className="text-gray-600">
              Maya R. earned {maya.stars} stars for her ChatGPT order and now has {maya.balance} of {LOYALTY_PROGRAM.rewardAt}.
            </span>
            <Link to={`/customers/${MAYA.id}`} className="font-medium text-brand-700 hover:underline">
              View Maya’s profile
            </Link>
            <Link to="/ai-channels/results" className="font-medium text-brand-700 hover:underline">
              See results
            </Link>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cx('space-y-4 transition-opacity', !cfg.enabled && 'opacity-90')}>
          <Card>
            <CardHeader title="Identity matching" subtitle="How an AI-channel order is connected to an existing customer." />
            <div className="space-y-4 px-5 pt-4 pb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label="Match by phone number" desc="Uses the phone number shared with the order" checked={cfg.matchPhone} onChange={(v) => set({ matchPhone: v })} />
                <Toggle label="Match by email" desc="Uses the email shared with the order" checked={cfg.matchEmail} onChange={(v) => set({ matchEmail: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Required match confidence" hint={cfg.confidence === 'medium' ? 'Not recommended: may reward the wrong person.' : 'Only one customer record may match.'}>
                  <Select
                    className="w-full"
                    label="Required match confidence"
                    value={cfg.confidence}
                    onChange={(v) => set({ confidence: v })}
                    options={[
                      { value: 'high', label: 'High confidence only (recommended)' },
                      { value: 'medium', label: 'Allow medium confidence' },
                    ]}
                  />
                </Field>
                <Field label="Ambiguous or unmatched orders" hint="Never rewarded automatically.">
                  <Select
                    className="w-full"
                    label="Ambiguous or unmatched orders"
                    value={cfg.ambiguous}
                    onChange={(v) => set({ ambiguous: v })}
                    options={[
                      { value: 'review', label: 'Hold for manual review' },
                      { value: 'skip', label: 'Skip — don’t reward' },
                    ]}
                  />
                </Field>
              </div>
              {!cfg.matchPhone && !cfg.matchEmail && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">With no matching signals enabled, no AI-channel orders can be rewarded.</p>}
              <div className="flex gap-2.5 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                <ShieldCheck className="mt-px size-4 shrink-0 text-gray-500" />
                <p>
                  <span className="font-medium text-gray-800">Privacy & consent.</span> Matching depends on authorized access to order data from each channel, the customer’s contact details being shared with the order, and appropriate data handling. Anonymous orders are never attributed to named customers.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Rewards" subtitle={`Uses your existing ${LOYALTY_PROGRAM.name} rules.`} />
            <div className="space-y-4 px-5 pt-4 pb-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Points earned" hint={`Same as app orders: a ${fmtMoney(maya.order.totalCents, 2)} order earns ${starsFor(maya.order.totalCents, { ...cfg, firstOrderBonus: false }, false)} stars.`}>
                  <Select
                    className="w-full"
                    label="Points earned"
                    value={cfg.spendPerStar}
                    onChange={(v) => set({ spendPerStar: v })}
                    options={[
                      { value: 5, label: '1 star per $5 (app-equivalent)' },
                      { value: 10, label: '1 star per $10' },
                    ]}
                  />
                </Field>
                <Field label="Reward threshold">
                  <div className="flex h-9 items-center rounded-lg border border-line bg-gray-50 px-3 text-sm text-muted">
                    {LOYALTY_PROGRAM.rewardAt} stars · {LOYALTY_PROGRAM.rewardName}
                  </div>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label={`First AI order bonus (+${cfg.firstOrderBonusStars} star)`} desc="Extra welcome star on a customer’s first eligible AI order" checked={cfg.firstOrderBonus} onChange={(v) => set({ firstOrderBonus: v })} />
                <Toggle label="Preserve visit streaks" desc="Eligible AI orders count toward weekly streaks" checked={cfg.streakPreservation} onChange={(v) => set({ streakPreservation: v })} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Follow-up message"
              subtitle="Sent after an eligible order is rewarded. Preview only in this prototype."
              action={<Switch checked={cfg.followUp} onChange={(v) => set({ followUp: v })} label="Send follow-up message" />}
            />
            <div className={cx('space-y-4 px-5 pt-4 pb-5', !cfg.followUp && 'pointer-events-none opacity-50')}>
              <Field label="Channel">
                <Segmented
                  label="Follow-up channel"
                  value={cfg.followUpChannel}
                  onChange={(v) => set({ followUpChannel: v })}
                  options={[
                    { value: 'sms', label: 'SMS (opted-in customers)' },
                    { value: 'push', label: 'Push (app users with push on)' },
                  ]}
                />
              </Field>
              {cfg.followUpChannel === 'push' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Push reaches only customers who installed the app and allowed notifications. Maya hasn’t installed the app, so she would not receive a push follow-up.</p>
              )}
              <Field label="Message" hint={<span>Tokens: {'{first_name}'} {'{merchant}'} {'{channel}'} {'{stars}'} · {message.length} characters · {segments} SMS segment{segments === 1 ? '' : 's'}</span>}>
                <textarea rows={3} className={inputCls} value={cfg.template} onChange={(e) => set({ template: e.target.value })} aria-label="Follow-up message template" />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  icon={<MonitorSmartphone className="size-4" />}
                  onClick={() => {
                    setUi({ previewNonce: ui.previewNonce + 1, phoneTab: 'sms' });
                    toast({ title: 'Test preview updated', body: 'Shown on the phone preview only. Nothing was sent.', tone: 'info' });
                  }}
                >
                  Send test preview
                </Button>
                <Button variant="ghost" onClick={() => set({ template: 'Thanks for ordering from {merchant} via {channel}! You\'ve earned {stars} stars. Open our app to continue your streak: [demo app link]' })}>
                  Restore default
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card data-tour="phone-preview" className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Customer journey preview</div>
              <Segmented
                size="sm"
                label="Preview mode"
                value={ui.phoneTab}
                onChange={(v) => setUi({ phoneTab: v })}
                options={[
                  { value: 'sms', label: cfg.followUpChannel === 'push' ? 'Push' : 'SMS' },
                  { value: 'app', label: 'App' },
                ]}
              />
            </div>
            {ui.phoneTab === 'sms' ? (
              cfg.followUpChannel === 'push' ? (
                <PushPreview text={message} nonce={ui.previewNonce} />
              ) : (
                <SmsPreview text={cfg.followUp ? message : 'Follow-up messages are off.'} nonce={ui.previewNonce} sentAt={`Today ${fmtDateTime(maya.order.placedAt + 60_000).replace('Today, ', '')}`} />
              )
            ) : (
              <AppPreview name="Maya" starsEarned={maya.stars} balance={maya.previewBalance} streakWeeks={maya.previewStreak} active />
            )}
            <p className="mt-3 text-center text-[11px] text-muted">Preview for Maya R. · fictional demo customer · nothing is sent</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="size-4 text-brand-600" /> Projected impact
              <InfoTip text="Illustrative projections based on assumed conversion and repeat-purchase behavior. Not guaranteed outcomes." />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="tabular text-xl font-semibold">{fmtNum(proj.installs)}<span className="text-sm font-normal text-muted">/mo</span></div>
                <div className="text-xs text-muted">Estimated new app installations</div>
              </div>
              <div>
                <div className="tabular text-xl font-semibold">{fmtMoney(proj.revenueCents)}<span className="text-sm font-normal text-muted">/mo</span></div>
                <div className="text-xs text-muted">Estimated recaptured revenue</div>
              </div>
            </div>
            <button onClick={() => setAssumptions((a) => !a)} aria-expanded={assumptions} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700">
              Explore assumptions <ChevronDown className={cx('size-4 transition-transform', assumptions && 'rotate-180')} />
            </button>
            {assumptions && (
              <dl className="mt-2 animate-fade-in space-y-1.5 border-t border-line pt-2 text-xs">
                <A k="Eligible AI orders (last 30 days)" v={fmtNum(proj.eligible)} />
                <A k="Assumed app-install conversion" v={fmtPct(ASSUMPTIONS.projectedInstallRate, 0)} />
                <A k="Repeat app orders per new install" v={`${ASSUMPTIONS.projectedRepeatOrdersPerInstall}/mo`} />
                <A k="Average AI order value" v={fmtMoney(proj.avgCents, 2)} />
                <A k="Revenue = installs × repeat × avg." v="rounded to $10" />
                <p className="pt-1 text-muted">Changes to matching settings change eligible orders and these estimates.</p>
              </dl>
            )}
          </Card>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-muted">
            <Sparkles className="size-3.5" /> Settings save automatically in this prototype.
          </div>
        </div>
      </div>
    </>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function A({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular font-medium">{v}</dd>
    </div>
  );
}

