import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ShoppingBag, UtensilsCrossed, Users, Award, Megaphone, Sparkles, Clock, Settings, ChevronDown, Radar,
  HelpCircle, MapPin, Check, Menu as MenuIcon, X, LogOut, UserCog, RotateCcw, PlayCircle, BookOpen,
} from 'lucide-react';
import { LOCATIONS, MERCHANT } from '../data/seed';
import { useStore } from '../state/store';
import { useTour } from '../tour/TourProvider';
import { ConfirmModal, Modal, Button, MenuItemButton, Popover, cx } from './ui';

interface NavLeaf {
  label: string;
  to: string;
  tourId?: string;
}
interface NavEntry {
  label: string;
  icon: typeof Home;
  to?: string;
  children?: NavLeaf[];
  badge?: string;
  tourId?: string;
  base?: string;
}

const NAV: NavEntry[] = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Orders', icon: ShoppingBag, to: '/orders' },
  { label: 'Menu', icon: UtensilsCrossed, to: '/menu' },
  { label: 'Customers', icon: Users, to: '/customers' },
  { label: 'Loyalty', icon: Award, to: '/loyalty' },
  {
    label: 'Marketing',
    icon: Megaphone,
    base: '/marketing',
    children: [
      { label: 'Push Notifications', to: '/marketing/push' },
      { label: 'SMS', to: '/marketing/sms' },
      { label: 'Email', to: '/marketing/email' },
      { label: 'Olivia AI', to: '/marketing/olivia' },
    ],
  },
  {
    label: 'AI Channels',
    icon: Radar,
    base: '/ai-channels',
    badge: 'NEW',
    tourId: 'nav-ai-channels',
    children: [
      { label: 'Overview', to: '/ai-channels/overview' },
      { label: 'Visibility', to: '/ai-channels/visibility' },
      { label: 'Loyalty Bridge', to: '/ai-channels/loyalty-bridge' },
      { label: 'Results', to: '/ai-channels/results' },
    ],
  },
  { label: 'Operations', icon: Clock, base: '/operations', children: [{ label: 'Operational Times', to: '/operations/hours' }] },
  { label: 'Settings', icon: Settings, base: '/settings', children: [{ label: 'User Management', to: '/settings/users' }] },
];

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-white">pd</span>
      <span className="text-[15px] font-semibold tracking-tight">Per Diem</span>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const active = NAV.find((n) => n.base && pathname.startsWith(n.base));
    if (active) setOpen((o) => ({ ...o, [active.label]: true }));
  }, [pathname]);

  const leafCls = ({ isActive }: { isActive: boolean }) =>
    cx('flex items-center rounded-lg py-1.5 pr-2 pl-9 text-[13px] transition-colors', isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-ink');

  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="flex h-14 items-center px-3">
        <Logo />
      </div>
      <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          if (!n.children) {
            return (
              <NavLink
                key={n.label}
                to={n.to!}
                end={n.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors', isActive || (n.to !== '/' && pathname.startsWith(n.to!)) ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700 hover:bg-gray-100')
                }
              >
                <Icon className="size-[18px]" strokeWidth={1.8} />
                {n.label}
              </NavLink>
            );
          }
          const isOpen = !!open[n.label];
          const inSection = pathname.startsWith(n.base!);
          return (
            <div key={n.label}>
              <button
                data-tour={n.tourId}
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [n.label]: !isOpen }))}
                className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-gray-100', inSection ? 'font-medium text-ink' : 'text-gray-700')}
              >
                <Icon className={cx('size-[18px]', inSection && 'text-brand-600')} strokeWidth={1.8} />
                <span className="flex-1 text-left">{n.label}</span>
                {n.badge && <span className="rounded bg-brand-600 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white">{n.badge}</span>}
                <ChevronDown className={cx('size-4 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} />
              </button>
              <div className={cx('grid transition-[grid-template-rows] duration-200', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="space-y-0.5 py-0.5">
                    {n.children.map((c) => (
                      <NavLink key={c.to} to={c.to} onClick={onNavigate} className={leafCls} tabIndex={isOpen ? 0 : -1}>
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line px-4 py-3">
        <div className="text-xs font-medium text-ink">{MERCHANT.name}</div>
        <div className="text-[11px] text-muted">
          {MERCHANT.plan} · Connected to {MERCHANT.pos}
        </div>
      </div>
    </nav>
  );
}

function Header() {
  const { demo, dispatch, toast, setUi } = useStore();
  const tour = useTour();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [helpCenter, setHelpCenter] = useState(false);
  const loc = LOCATIONS.find((l) => l.id === demo.locationId) ?? LOCATIONS[0];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <button aria-label="Open navigation" className="-ml-1 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={() => setUi({ mobileNav: true })}>
        <MenuIcon className="size-5" />
      </button>
      <Popover
        width={300}
        trigger={({ open, toggle }) => (
          <button onClick={toggle} aria-haspopup="menu" aria-expanded={open} className="flex min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium hover:bg-gray-50">
            <MapPin className="size-4 shrink-0 text-gray-500" />
            <span className="truncate">
              <span className="sm:hidden">{loc.name}</span>
              <span className="hidden sm:inline">{loc.label}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-gray-400" />
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Locations</div>
            {LOCATIONS.map((l) => (
              <MenuItemButton
                key={l.id}
                active={l.id === loc.id}
                icon={<MapPin className="size-4 text-gray-400" />}
                onClick={() => {
                  dispatch({ type: 'setLocation', id: l.id });
                  toast({ title: `Switched to ${l.label}`, tone: 'info' });
                  close();
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span className="block font-medium">{l.label}</span>
                    <span className="block text-xs text-muted">{l.address}</span>
                  </span>
                  {l.id === loc.id && <Check className="size-4 text-brand-600" />}
                </div>
              </MenuItemButton>
            ))}
          </>
        )}
      </Popover>
      <div className="flex-1" />
      <Popover
        align="right"
        width={240}
        trigger={({ toggle, open }) => (
          <button onClick={toggle} aria-label="Help" aria-expanded={open} className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-ink">
            <HelpCircle className="size-5" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItemButton icon={<PlayCircle className="size-4 text-gray-500" />} onClick={() => { close(); tour.start(); }}>
              Take the Beacon tour
            </MenuItemButton>
            <MenuItemButton icon={<BookOpen className="size-4 text-gray-500" />} onClick={() => { close(); setHelpCenter(true); }}>
              About this prototype
            </MenuItemButton>
          </>
        )}
      </Popover>
      <Popover
        align="right"
        width={240}
        trigger={({ toggle, open }) => (
          <button onClick={toggle} aria-label="Account menu" aria-expanded={open} className="ml-1 flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
            JE
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="px-2.5 py-2">
              <div className="text-sm font-medium">{MERCHANT.owner}</div>
              <div className="text-xs text-muted">{MERCHANT.ownerRole} · {MERCHANT.ownerEmail}</div>
            </div>
            <div className="my-1 h-px bg-line" />
            <MenuItemButton icon={<UserCog className="size-4 text-gray-500" />} onClick={() => { close(); navigate('/settings/users'); }}>
              User management
            </MenuItemButton>
            <MenuItemButton icon={<RotateCcw className="size-4 text-gray-500" />} onClick={() => { close(); setConfirmReset(true); }}>
              Reset demo data
            </MenuItemButton>
            <MenuItemButton icon={<LogOut className="size-4 text-gray-500" />} onClick={() => { close(); toast({ title: 'Sign-out is disabled in this prototype', tone: 'info' }); }}>
              Sign out
            </MenuItemButton>
          </>
        )}
      </Popover>
      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          tour.exit(true);
          dispatch({ type: 'reset' });
          navigate('/');
          toast({ title: 'Demo reset to the starting scenario' });
        }}
        title="Reset demo data?"
        body="Menu edits, the visibility score, Loyalty Bridge settings, and Maya's timeline return to the starting scenario."
        confirmLabel="Reset demo"
      />
      <Modal open={helpCenter} onClose={() => setHelpCenter(false)} label="About this prototype" width={520}>
        <div className="p-6">
          <h2 className="text-base font-semibold">About this prototype</h2>
          <div className="mt-3 space-y-2.5 text-sm text-gray-600">
            <p>Per Diem Beacon is a concept prototype, not an official Per Diem product. All merchants, customers, and figures are fictional, illustrative data.</p>
            <p>No network calls are made to Square, Per Diem, OpenAI, Anthropic, Google, or Cash App. Order-source attribution, contact availability on AI-channel orders, identity matching, and loyalty awarding are integration assumptions.</p>
            <p>Square syncs, AI discovery results, and SMS/push messages are simulated. Revenue at risk, installs, and recaptured revenue are modeled estimates.</p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={() => setHelpCenter(false)}>Got it</Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}

export function AppLayout({ overlays }: { overlays: ReactNode }) {
  const { ui, setUi } = useStore();
  const { pathname } = useLocation();
  useEffect(() => {
    setUi({ mobileNav: false });
  }, [pathname, setUi]);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-white lg:block">
        <Sidebar />
      </aside>
      {ui.mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-gray-900/30" onClick={() => setUi({ mobileNav: false })} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-in bg-white shadow-pop">
            <button aria-label="Close navigation" className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setUi({ mobileNav: false })}>
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setUi({ mobileNav: false })} />
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <Header />
        <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-24 sm:px-6 lg:px-8">
          <Outlet />
          <footer className="mt-12 border-t border-line pt-4 text-xs text-subtle">Concept prototype — not an official Per Diem product.</footer>
        </main>
      </div>
      {overlays}
    </div>
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}
