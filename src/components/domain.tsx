import { Bell, ChevronLeft, Coffee, Flame, Gift, Star, Wifi, BatteryFull, Signal, Lock } from 'lucide-react';
import { CHANNEL_BY_ID, LOYALTY_PROGRAM, MENU_SEED } from '../data/seed';
import type { ChannelId, LoyaltyState, MatchStatus, OrderLine } from '../data/types';
import { scoreStatus } from '../lib/visibility';
import { Badge, cx, useTween } from './ui';

export function ChannelBadge({ id, short }: { id: ChannelId; short?: boolean }) {
  const c = CHANNEL_BY_ID[id];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-gray-700">
      <ChannelGlyph id={id} />
      {short ? c.short : c.label}
    </span>
  );
}

/** Neutral monogram glyphs — deliberately not third-party logos. */
export function ChannelGlyph({ id }: { id: ChannelId | 'app' | 'web' | 'instore' }) {
  const map: Record<string, string> = { chatgpt: 'G', claude: 'C', cashapp: '$', gemini: 'Ge', app: 'A', web: 'W', instore: 'S' };
  return (
    <span aria-hidden className="inline-flex size-4 items-center justify-center rounded-[4px] bg-gray-100 text-[9px] font-semibold text-gray-600">
      {map[id]}
    </span>
  );
}

export function SourceBadge({ source }: { source: 'app' | 'web' | 'instore' | ChannelId }) {
  if (source in CHANNEL_BY_ID) return <ChannelBadge id={source as ChannelId} short />;
  const labels = { app: 'App', web: 'Web', instore: 'In-store' } as const;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', source === 'app' ? 'border-brand-100 bg-brand-50 text-brand-700' : 'border-line bg-white text-gray-700')}>
      <ChannelGlyph id={source as 'app'} />
      {labels[source as keyof typeof labels]}
    </span>
  );
}

export function LoyaltyBadge({ state }: { state: LoyaltyState }) {
  if (state === 'rewarded') return <Badge tone="green" dot>Rewarded</Badge>;
  if (state === 'pending') return <Badge tone="amber" dot>Eligible — pending</Badge>;
  if (state === 'review') return <Badge tone="violet" dot>Needs review</Badge>;
  return <Badge tone="gray" dot>Not enrolled</Badge>;
}

export function MatchBadge({ status }: { status: MatchStatus }) {
  if (status === 'matched') return <Badge tone="blue">Matched</Badge>;
  if (status === 'probable') return <Badge tone="gray">Possible match</Badge>;
  if (status === 'ambiguous') return <Badge tone="gray">Ambiguous</Badge>;
  return <Badge tone="gray">No contact info</Badge>;
}

const NAME = Object.fromEntries(MENU_SEED.map((m) => [m.id, m.name]));
export function itemsLabel(lines: OrderLine[]) {
  return lines.map((l) => (l.qty > 1 ? `${l.qty}× ${NAME[l.itemId]}` : NAME[l.itemId])).join(', ');
}
export const itemName = (id: string) => NAME[id];

// ---- Score ring -------------------------------------------------------------------------------

export function ScoreRing({ score, size = 168 }: { score: number; size?: number }) {
  const v = useTween(score, 1100);
  const status = scoreStatus(Math.round(v));
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const color = { red: '#dc2626', amber: '#d97706', blue: '#2453f0', green: '#059669' }[status.tone];
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Visibility score ${score} of 100, ${scoreStatus(score).label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke 400ms' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="tabular text-[40px] leading-none font-semibold tracking-tight text-ink">
          {Math.round(v)}
          <span className="text-base font-medium text-subtle">/100</span>
        </div>
        <div className="mt-1.5 text-sm font-semibold" style={{ color }}>
          {status.label}
        </div>
      </div>
    </div>
  );
}

// ---- Phone mockup -----------------------------------------------------------------------------

function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div className={cx('flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold', dark ? 'text-white' : 'text-gray-900')}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <Signal className="size-3" />
        <Wifi className="size-3" />
        <BatteryFull className="size-3.5" />
      </span>
    </div>
  );
}

export function PhoneFrame({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="mx-auto w-[272px] rounded-[44px] bg-gray-900 p-2.5 shadow-[0_24px_48px_-16px_rgba(16,24,40,0.35)]">
      <div className={cx('relative h-[540px] overflow-hidden rounded-[36px]', dark ? 'bg-gray-900' : 'bg-white')}>
        <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
        <StatusBar dark={dark} />
        {children}
      </div>
    </div>
  );
}

export function SmsPreview({ text, nonce, sentAt }: { text: string; nonce: number; sentAt: string }) {
  const parts = text.split('[demo app link]');
  return (
    <PhoneFrame>
      <div className="flex flex-col items-center border-b border-gray-100 pt-3 pb-2.5">
        <div className="flex w-full items-center px-3">
          <ChevronLeft className="size-5 text-[#0a84ff]" />
        </div>
        <div className="-mt-4 flex size-10 items-center justify-center rounded-full bg-[#1f3d2b] text-xs font-semibold text-[#f3ead8]">J&B</div>
        <div className="mt-1 text-[11px] font-medium text-gray-900">Juniper & Bean</div>
      </div>
      <div className="px-3 pt-4">
        <div className="mb-2 text-center text-[10px] text-gray-400">Text Message · {sentAt}</div>
        <div key={nonce} className="max-w-[86%] animate-msg-in rounded-2xl rounded-bl-md bg-[#e9e9eb] px-3 py-2 text-[13px] leading-snug text-gray-900">
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 && <span className="text-[#0a84ff] underline">jbcoffee.example/app</span>}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-gray-400">Reply STOP to opt out</div>
      </div>
    </PhoneFrame>
  );
}

export function PushPreview({ text, nonce }: { text: string; nonce: number }) {
  return (
    <PhoneFrame dark>
      <div className="flex h-full flex-col bg-gradient-to-b from-[#2a3b4f] to-[#121a24] px-3">
        <div className="mt-6 flex flex-col items-center text-white">
          <Lock className="size-4 opacity-80" />
          <div className="mt-1 text-5xl font-light">9:41</div>
          <div className="text-xs opacity-80">Sunday, October 4</div>
        </div>
        <div key={nonce} className="mt-8 animate-msg-in rounded-2xl bg-white/85 p-3 backdrop-blur">
          <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600">
            <span className="flex size-5 items-center justify-center rounded-md bg-[#1f3d2b] text-[7px] font-bold text-[#f3ead8]">J&B</span>
            JUNIPER & BEAN <span className="ml-auto">now</span>
          </div>
          <div className="mt-1 text-[12.5px] leading-snug text-gray-900">{text.replace('[demo app link]', '').trim()}</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function AppPreview({ name, starsEarned, balance, streakWeeks, active }: { name: string; starsEarned: number; balance: number; streakWeeks: number; active: boolean }) {
  const toGo = Math.max(0, LOYALTY_PROGRAM.rewardAt - balance);
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-[#f6f1e7]">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#1f3d2b] text-[9px] font-bold text-[#f3ead8]">J&B</span>
            <span className="text-[13px] font-semibold text-[#1f3d2b]">Juniper & Bean</span>
          </div>
          <Bell className="size-4 text-[#1f3d2b]" />
        </div>
        <div className="px-4 pt-5">
          <div className="text-[20px] leading-tight font-semibold text-[#1f2a22]">Welcome back, {name}.</div>
          <div className="mt-1 text-[12px] text-[#5b6b5f]">Williamsburg · Open until 6:00 PM</div>
        </div>
        <div className="mx-4 mt-4 rounded-2xl bg-[#1f3d2b] p-4 text-[#f3ead8]">
          <div className="flex items-center gap-1.5 text-[11px] tracking-wide uppercase opacity-80">
            <Star className="size-3 fill-current" /> {LOYALTY_PROGRAM.name}
          </div>
          <div className="mt-1 text-[15px] font-semibold">{active ? `${starsEarned} stars are waiting for you.` : 'Earn stars on every order.'}</div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold">{balance}</span>
            <span className="text-xs opacity-80">/ {LOYALTY_PROGRAM.rewardAt} stars</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#e9b44c] transition-[width] duration-700" style={{ width: `${(balance / LOYALTY_PROGRAM.rewardAt) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] opacity-85">
            <Gift className="size-3" /> {toGo} more to a {LOYALTY_PROGRAM.rewardName.toLowerCase()}
          </div>
        </div>
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-white p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#fbe8d3] text-[#c4622d]">
            <Flame className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#1f2a22]">Continue your streak</div>
            <div className="text-[11px] text-[#5b6b5f]">{streakWeeks}-week visit streak · order by Sunday</div>
          </div>
        </div>
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-white p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#e4ece5] text-[#1f3d2b]">
            <Coffee className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#1f2a22]">Your usual</div>
            <div className="text-[11px] text-[#5b6b5f]">Oat Latte · Cardamom Bun</div>
          </div>
        </div>
        <div className="mt-auto px-4 pb-6">
          <div className="rounded-xl bg-[#1f3d2b] py-3 text-center text-[13px] font-semibold text-[#f3ead8]">Open Juniper & Bean</div>
        </div>
      </div>
    </PhoneFrame>
  );
}
