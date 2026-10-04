import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, CheckCircle2, ChevronDown, FlaskConical, ImageOff, MessageSquareText, Search, Sparkles, Star, Wand2 } from 'lucide-react';
import {
  DESCRIPTION_SUGGESTIONS, DIETARY_OPTIONS, DIETARY_SUGGESTIONS, HOLIDAY_SUGGESTIONS, LOCATIONS, MERCHANT, SIGNATURE_SUGGESTIONS,
} from '../data/seed';
import type { HolidayHours, MenuItem } from '../data/types';
import { auditIssues, discovery, INITIAL_SCORE, QUERIES, scoreFactors, scoreStatus, visibilityScore, type IssueId } from '../lib/visibility';
import { demoDescriptionEdits, demoDietaryEdits, SYNC_TOAST, useStore } from '../state/store';
import { Badge, Button, Card, CardHeader, Checkbox, Drawer, EmptyNote, InfoTip, PageHeader, ProgressBar, cx, inputCls } from '../components/ui';
import { ScoreRing } from '../components/domain';
import { fmtMoney } from '../lib/metrics';

const SEV_TONE = { High: 'red', Medium: 'amber', Low: 'gray' } as const;

export function VisibilityPage() {
  const { demo, ui, setUi, dispatch, toast } = useStore();
  const score = visibilityScore(demo);
  const status = scoreStatus(score);
  const factors = scoreFactors(demo);
  const issues = auditIssues(demo);
  const open = issues.filter((i) => !i.resolved && i.action === 'olivia').length;
  const loc = LOCATIONS.find((l) => l.id === demo.locationId)!;
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runDemoFixes = () => {
    setRunning(true);
    const steps: (() => void)[] = [
      () => dispatch({ type: 'applyDescriptions', edits: demoDescriptionEdits(demoRef.current.menu) }),
      () => dispatch({ type: 'applyDietary', edits: demoDietaryEdits(demoRef.current.menu) }),
      () => !demoRef.current.holidayHours && dispatch({ type: 'applyHoliday', hours: HOLIDAY_SUGGESTIONS }),
      () => demoRef.current.menu.filter((m) => m.signature).length < 2 && dispatch({ type: 'applySignature', ids: SIGNATURE_SUGGESTIONS }),
      () => {
        setRunning(false);
        toast(SYNC_TOAST);
      },
    ];
    steps.forEach((fn, i) => timers.current.push(window.setTimeout(fn, 250 + i * 650)));
  };
  const demoRef = useRef(demo);
  demoRef.current = demo;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="blue">Beacon</Badge>}
        title="AI Visibility"
        subtitle="See how your storefront is represented in AI-assisted local discovery and improve the information customers find."
        actions={
          <>
            <Button icon={<FlaskConical className="size-4" />} loading={running} disabled={open === 0} onClick={runDemoFixes} title="Applies Olivia's prepared suggestions to all open content issues">
              Demo: apply prepared fixes
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card data-tour="visibility-score" className="p-5 lg:col-span-2">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold">
            AI visibility score
            <InfoTip text="A deterministic, simulated audit of your storefront data. It measures how complete and descriptive your information is — not a live ranking from any assistant." />
          </div>
          <p className="text-[13px] text-muted">{loc.label} storefront</p>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
            <ScoreRing score={score} />
            <div className="min-w-0 flex-1 text-[13px] text-gray-600">
              {score < 85 ? (
                <p>
                  Your basics are in place, but thin menu content limits how well assistants can describe and recommend you. <strong className="font-medium text-ink">{open} fixable issues</strong> are worth up to +{86 - score >= 0 ? 86 - score : 0} pts.
                </p>
              ) : (
                <p>
                  <strong className="font-medium text-emerald-700">Strong.</strong> Your menu is descriptive and structured. Remaining upside is real photography and review volume.
                </p>
              )}
              {score !== INITIAL_SCORE && <p className="mt-2 text-xs text-muted">Started at {INITIAL_SCORE} · {score > INITIAL_SCORE ? '+' : ''}{score - INITIAL_SCORE} pts from applied changes</p>}
            </div>
          </div>
          <ul className="mt-5 space-y-2.5">
            {factors.map((f) => (
              <li key={f.id}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{f.label}</span>
                  <span className="tabular text-muted">{f.score}/{f.max}</span>
                </div>
                <ProgressBar className="mt-1" value={f.score / f.max} tone={f.score === f.max ? 'green' : 'brand'} />
                <div className="mt-0.5 text-xs text-subtle">{f.detail}</div>
              </li>
            ))}
          </ul>
          <span className="sr-only">Status {status.label}</span>
        </Card>

        <DiscoveryPanel />
      </div>

      <Card data-tour="audit-list" className="mt-4">
        <CardHeader title="Visibility audit" subtitle={`${issues.filter((i) => !i.resolved).length} open · ${issues.filter((i) => i.resolved).length} resolved`} action={<Link to="/menu" className="text-[13px] font-medium text-brand-700 hover:underline">Open menu</Link>} />
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {issues.map((iss) => {
            const expanded = ui.expandedIssue === iss.id;
            return (
              <li key={iss.id}>
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <button
                    aria-expanded={expanded}
                    onClick={() => setUi({ expandedIssue: expanded ? null : iss.id })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {iss.resolved ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <span className={cx('size-2.5 shrink-0 rounded-full', iss.severity === 'High' ? 'bg-red-500' : iss.severity === 'Medium' ? 'bg-amber-500' : 'bg-gray-400')} />}
                    <span className={cx('min-w-0 text-sm font-medium', iss.resolved && 'text-muted')}>{iss.resolved ? iss.resolvedTitle : iss.title}</span>
                    {!iss.resolved && <Badge tone={SEV_TONE[iss.severity]}>{iss.severity}</Badge>}
                    <ChevronDown className={cx('ml-auto size-4 shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')} />
                  </button>
                  {iss.resolved ? (
                    <Badge tone="green">Resolved</Badge>
                  ) : iss.action === 'olivia' ? (
                    <Button data-tour={`fix-${iss.id}`} size="sm" variant="primary" icon={<Sparkles className="size-3.5" />} onClick={() => setUi({ oliviaIssue: iss.id })}>
                      Fix with Olivia
                    </Button>
                  ) : (
                    <Button size="sm" icon={<Camera className="size-3.5" />} onClick={() => setUi({ oliviaIssue: 'photos' })}>
                      {demo.photoShotList ? 'View shot list' : 'Photo checklist'}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="animate-fade-in px-5 pb-4 pl-[52px]">
                    <p className="text-[13px] text-gray-600">{iss.explanation}</p>
                    <p className="mt-1.5 text-xs text-muted">
                      <span className="font-medium text-gray-700">Potential impact:</span> {iss.resolved ? 'Resolved — counted in your score.' : iss.impact}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {demo.fixes.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Applied changes" subtitle="Saved to the prototype’s menu data. Simulated sync — nothing is sent to Square." />
          <ul className="px-5 pt-2 pb-4">
            {demo.fixes.slice().reverse().map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 border-b border-line py-2 text-[13px] last:border-0">
                <Check className="size-4 text-emerald-600" />
                <span className="flex-1">{f.summary}</span>
                <span className="text-xs text-muted">via Olivia</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <OliviaDrawer />
    </>
  );
}

// ---- Simulated discovery ----------------------------------------------------------------------

function DiscoveryPanel() {
  const { demo, ui, setUi } = useStore();
  const d = discovery(ui.discoveryQuery, demo, MERCHANT.short);
  const prevRank = useRef(d.rank);
  const [improved, setImproved] = useState(false);
  useEffect(() => {
    if (d.rank < prevRank.current) {
      setImproved(true);
      const t = setTimeout(() => setImproved(false), 2400);
      prevRank.current = d.rank;
      return () => clearTimeout(t);
    }
    prevRank.current = d.rank;
  }, [d.rank]);

  return (
    <Card data-tour="discovery-panel" className="flex flex-col lg:col-span-3">
      <CardHeader
        title="Ask like a customer"
        subtitle="Preview how a request might be answered from your storefront data."
        action={<Badge tone="violet">Simulated discovery preview</Badge>}
      />
      <div className="flex flex-wrap gap-2 px-5 pt-3">
        {QUERIES.map((q) => (
          <button
            key={q.id}
            aria-pressed={ui.discoveryQuery === q.id}
            onClick={() => setUi({ discoveryQuery: q.id })}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
              ui.discoveryQuery === q.id ? 'border-brand-300 bg-brand-50 font-medium text-brand-700' : 'border-line-strong bg-white text-gray-700 hover:bg-gray-50',
            )}
          >
            <Search className="size-3.5" />“{q.text}.”
          </button>
        ))}
      </div>
      <div className="m-5 mt-4 flex-1 rounded-xl border border-line bg-gray-50/60 p-4">
        <div className="flex gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-line">
            <MessageSquareText className="size-3.5" />
          </span>
          <p key={ui.discoveryQuery + d.rank} className="animate-fade-in text-[13px] leading-relaxed text-gray-700">
            {d.answer}
          </p>
        </div>
        <ol className="mt-4 space-y-1.5">
          {d.results.map((r, i) => (
            <li
              key={r.name}
              className={cx(
                'flex items-start gap-3 rounded-lg px-3 py-2 transition-colors duration-500',
                r.isMerchant ? (improved ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white ring-1 ring-brand-200') : 'bg-white/60',
              )}
            >
              <span className={cx('tabular mt-0.5 w-5 text-sm font-semibold', r.isMerchant ? 'text-brand-700' : 'text-subtle')}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.name}
                  {r.isMerchant && <Badge tone="blue">You</Badge>}
                </div>
                <div className="text-xs text-muted">{r.note}</div>
              </div>
              <span className="tabular text-xs text-subtle">{r.score}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-700">Simulated ranking factors for {MERCHANT.short}</div>
          <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
            {d.factors.map((f) => (
              <li key={f.label} className="flex items-start gap-1.5 text-xs text-gray-600">
                {f.met ? <Check className="mt-px size-3.5 shrink-0 text-emerald-600" /> : <span className="mt-1 size-2 shrink-0 rounded-full border border-gray-400" />}
                {f.label}
              </li>
            ))}
          </ul>
        </div>
        {d.rank === 1 && (
          <p className="mt-3 text-xs text-emerald-800">Your improved menu information contributed to this simulated #1 result.</p>
        )}
      </div>
      <p className="px-5 pb-4 text-[11px] text-subtle">Prototype simulation using a deterministic scoring model and fictional competitors. No assistant was queried and real rankings may differ.</p>
    </Card>
  );
}

// ---- Olivia drawer ----------------------------------------------------------------------------

function OliviaHeaderIcon() {
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
      <Sparkles className="size-[18px]" />
    </span>
  );
}

function useApply(onDone: () => void) {
  const [loading, setLoading] = useState(false);
  const run = (fn: () => void) => {
    setLoading(true);
    window.setTimeout(() => {
      fn();
      setLoading(false);
      onDone();
    }, 450);
  };
  return { loading, run };
}

export function OliviaDrawer() {
  const { ui, setUi } = useStore();
  const issue = ui.oliviaIssue;
  const close = () => setUi({ oliviaIssue: null });
  if (!issue) return null;
  return <OliviaInner key={issue} issue={issue} close={close} />;
}

function OliviaInner({ issue, close }: { issue: IssueId; close: () => void }) {
  const { demo, dispatch, toast } = useStore();
  const done = () => {
    toast(SYNC_TOAST);
    close();
  };
  const { loading, run } = useApply(done);
  const titles: Record<IssueId, string> = {
    descriptions: 'Menu descriptions',
    dietary: 'Dietary tags',
    holiday: 'Holiday hours',
    signature: 'Signature items',
    photos: 'Photo checklist',
  };

  // Descriptions
  const missing = demo.menu.filter((m) => !m.description);
  const [descEdits, setDescEdits] = useState<Record<string, string>>(() => Object.fromEntries(missing.map((m) => [m.id, DESCRIPTION_SUGGESTIONS[m.id] ?? ''])));
  const [descInclude, setDescInclude] = useState<Record<string, boolean>>(() => Object.fromEntries(missing.map((m) => [m.id, true])));
  const [selected, setSelected] = useState(missing[0]?.id ?? '');

  // Dietary
  const dietItems = demo.menu.filter((m) => DIETARY_SUGGESTIONS[m.id] && m.dietary.length === 0);
  const [diet, setDiet] = useState<Record<string, string[]>>(() => Object.fromEntries(dietItems.map((m) => [m.id, DIETARY_SUGGESTIONS[m.id]])));

  // Holiday
  const [holiday, setHoliday] = useState<HolidayHours[]>(() => demo.holidayHours ?? HOLIDAY_SUGGESTIONS);

  // Signature
  const [sig, setSig] = useState<string[]>(() => (demo.menu.some((m) => m.signature) ? demo.menu.filter((m) => m.signature).map((m) => m.id) : SIGNATURE_SUGGESTIONS));

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let count = 0;

  if (issue === 'descriptions') {
    count = Object.entries(descInclude).filter(([id, on]) => on && descEdits[id]?.trim()).length;
    const item = missing.find((m) => m.id === selected);
    body = missing.length === 0 ? (
      <EmptyNote>All menu items already have descriptions.</EmptyNote>
    ) : (
      <>
        <p className="text-[13px] text-gray-600">Olivia drafted descriptions for {missing.length} items using your menu, prices, and item names. Review and edit before applying.</p>
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {missing.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', selected === m.id ? 'border-brand-300 bg-brand-50 font-medium text-brand-700' : 'border-line-strong text-gray-600 hover:bg-gray-50')}
            >
              {descInclude[m.id] ? <Check className="size-3" /> : <span className="size-3" />}
              {m.name}
            </button>
          ))}
        </div>
        {item && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MenuCard label="Before" item={item} desc="" />
              <MenuCard label="After" item={item} desc={descEdits[item.id]} highlight />
            </div>
            <div>
              <label htmlFor="olivia-desc" className="mb-1.5 block text-[13px] font-medium">
                Description for {item.name}
              </label>
              <textarea id="olivia-desc" rows={4} className={inputCls} value={descEdits[item.id]} onChange={(e) => setDescEdits((d) => ({ ...d, [item.id]: e.target.value }))} />
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>{descEdits[item.id].length} characters · aim for 60–160</span>
                <button className="font-medium text-brand-700 hover:underline" onClick={() => setDescEdits((d) => ({ ...d, [item.id]: DESCRIPTION_SUGGESTIONS[item.id] ?? '' }))}>
                  Reset to suggestion
                </button>
              </div>
            </div>
            <Checkbox checked={!!descInclude[item.id]} onChange={(v) => setDescInclude((d) => ({ ...d, [item.id]: v }))} label="Include this item when applying" />
            <div className="rounded-lg bg-brand-50/60 p-3 text-[13px] text-gray-700">
              <span className="font-medium text-ink">Why this helps: </span>
              Specific details — preparation, size, ingredients, dietary fit — give discovery surfaces concrete language to match against requests.
            </div>
          </div>
        )}
      </>
    );
    footer = (
      <Button variant="primary" loading={loading} disabled={!count} onClick={() => run(() => dispatch({ type: 'applyDescriptions', edits: Object.fromEntries(Object.entries(descEdits).filter(([id, v]) => descInclude[id] && v.trim())) }))}>
        Apply {count} description{count === 1 ? '' : 's'}
      </Button>
    );
  } else if (issue === 'dietary') {
    count = Object.values(diet).filter((t) => t.length).length;
    body = dietItems.length === 0 ? (
      <EmptyNote>Dietary tags are already set on all relevant items.</EmptyNote>
    ) : (
      <>
        <p className="text-[13px] text-gray-600">Olivia suggested tags from ingredients in your item names and descriptions. Confirm each one — dietary claims should always be verified by your team.</p>
        <ul className="mt-4 space-y-3">
          {dietItems.map((m) => (
            <li key={m.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                {m.name}
                <span className="text-xs font-normal text-muted">Before: no tags</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DIETARY_OPTIONS.map((t) => {
                  const on = diet[m.id]?.includes(t);
                  return (
                    <button
                      key={t}
                      aria-pressed={on}
                      onClick={() => setDiet((d) => ({ ...d, [m.id]: on ? d[m.id].filter((x) => x !== t) : [...(d[m.id] ?? []), t] }))}
                      className={cx('rounded-full border px-2.5 py-0.5 text-xs transition-colors', on ? 'border-emerald-300 bg-emerald-50 font-medium text-emerald-800' : 'border-line-strong text-gray-500 hover:bg-gray-50')}
                    >
                      {on && <Check className="mr-0.5 -ml-0.5 inline size-3" />}
                      {t}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
    footer = (
      <Button variant="primary" loading={loading} disabled={!count} onClick={() => run(() => dispatch({ type: 'applyDietary', edits: Object.fromEntries(Object.entries(diet).filter(([, t]) => t.length)) }))}>
        Apply tags to {count} item{count === 1 ? '' : 's'}
      </Button>
    );
  } else if (issue === 'holiday') {
    body = (
      <>
        <p className="text-[13px] text-gray-600">Olivia suggested hours based on your regular schedule and typical neighborhood patterns. Edit any day before applying.</p>
        <div className="mt-4 rounded-lg border border-line">
          {holiday.map((h, i) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 border-b border-line px-3 py-2.5 last:border-0">
              <div className="min-w-[140px] flex-1">
                <div className="text-sm font-medium">{h.name}</div>
                <div className="text-xs text-muted">{h.date} · Before: regular hours</div>
              </div>
              <input
                aria-label={`${h.name} hours`}
                className={cx(inputCls, 'w-48')}
                value={h.hours}
                onChange={(e) => setHoliday((hs) => hs.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Applies to all three locations in this prototype.</p>
      </>
    );
    footer = (
      <Button variant="primary" loading={loading} onClick={() => run(() => dispatch({ type: 'applyHoliday', hours: holiday }))}>
        Apply holiday hours
      </Button>
    );
  } else if (issue === 'signature') {
    body = (
      <>
        <p className="text-[13px] text-gray-600">Olivia recommends highlighting items that are distinctive and frequently reordered. Choose at least two.</p>
        <ul className="mt-4 space-y-2">
          {demo.menu.map((m) => (
            <li key={m.id} className={cx('rounded-lg border px-3 py-2', sig.includes(m.id) ? 'border-brand-200 bg-brand-50/40' : 'border-line')}>
              <Checkbox
                checked={sig.includes(m.id)}
                onChange={(v) => setSig((s) => (v ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                label={
                  <span className="flex items-center gap-1.5">
                    {m.name}
                    {SIGNATURE_SUGGESTIONS.includes(m.id) && <Badge tone="violet">Olivia pick</Badge>}
                  </span>
                }
                description={SIGNATURE_SUGGESTIONS.includes(m.id) ? 'Unique to Juniper & Bean and a top reorder item' : fmtMoney(m.priceCents, 2)}
              />
            </li>
          ))}
        </ul>
      </>
    );
    footer = (
      <Button variant="primary" loading={loading} disabled={sig.length < 2} onClick={() => run(() => dispatch({ type: 'applySignature', ids: sig }))}>
        Highlight {sig.length} item{sig.length === 1 ? '' : 's'}
      </Button>
    );
  } else {
    const noPhoto = demo.menu.filter((m) => !m.photo);
    body = (
      <>
        <div className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">Olivia doesn’t generate product photos. Real photography of what customers receive should come from your team.</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {noPhoto.map((m) => (
            <div key={m.id} className="rounded-lg border border-dashed border-line-strong p-2">
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-gray-50 text-subtle">
                <ImageOff className="size-5" />
              </div>
              <div className="mt-1.5 truncate text-xs font-medium">{m.name}</div>
              <div className="text-[11px] text-muted">{demo.photoShotList ? 'On shot list' : 'Photo needed'}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Shot tips: natural light, 4:3 framing, the item as served. Photos would be worth up to +{noPhoto.length} pts.</p>
      </>
    );
    footer = demo.photoShotList ? (
      <Button variant="primary" onClick={close}>Done</Button>
    ) : (
      <Button
        variant="primary"
        icon={<Camera className="size-4" />}
        onClick={() => {
          dispatch({ type: 'createShotList' });
          toast({ title: 'Shot list saved', body: `${noPhoto.length} items added. Upload photos from Menu when they’re ready.` });
          close();
        }}
      >
        Save shot list
      </Button>
    );
  }

  return (
    <Drawer
      open
      onClose={close}
      tourId="olivia-drawer"
      width={580}
      icon={<OliviaHeaderIcon />}
      title={issue === 'photos' ? 'Photo checklist' : 'Fix with Olivia'}
      subtitle={titles[issue]}
      footer={
        <>
          <span className="mr-auto hidden text-xs text-muted sm:inline">
            <Wand2 className="mr-1 inline size-3.5" />
            Changes update prototype data only
          </span>
          <Button onClick={close}>Cancel</Button>
          {footer}
        </>
      }
    >
      {body}
    </Drawer>
  );
}

function MenuCard({ label, item, desc, highlight }: { label: string; item: MenuItem; desc: string; highlight?: boolean }) {
  const tags = DIETARY_SUGGESTIONS[item.id] && highlight ? item.dietary : [];
  return (
    <div className={cx('rounded-lg border p-3', highlight ? 'border-emerald-200 bg-emerald-50/30' : 'border-line bg-gray-50/50')}>
      <div className={cx('text-[11px] font-semibold tracking-wide uppercase', highlight ? 'text-emerald-700' : 'text-muted')}>{label}</div>
      <div className="mt-2 flex gap-2.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gray-100 text-subtle" title={item.photo ? 'Photo on file' : 'No photo — placeholder'}>
          {item.photo ? <Camera className="size-4" /> : <ImageOff className="size-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-medium">
            {item.name}
            {item.signature && <Star className="size-3 fill-amber-400 text-amber-400" />}
          </div>
          <div className="text-xs text-muted">{fmtMoney(item.priceCents, 2)}</div>
          <p className={cx('mt-1 text-xs leading-relaxed', desc ? 'text-gray-700' : 'text-subtle italic')}>{desc || 'No description'}</p>
          {tags.length > 0 && <div className="mt-1 text-[11px] text-emerald-700">{tags.join(' · ')}</div>}
        </div>
      </div>
    </div>
  );
}
