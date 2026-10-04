import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, Lightbulb, RotateCcw, X, PlayCircle } from 'lucide-react';
import { useStore } from '../state/store';
import { Button, ConfirmModal, Modal, Switch, cx } from '../components/ui';
import { TOUR_STEPS } from './steps';
import { useTour } from './TourProvider';
import { useNavigate } from 'react-router-dom';

const PAD = 6;

function findTarget(target: string | string[] | null): HTMLElement | null {
  if (!target) return null;
  const ids = Array.isArray(target) ? target : [target];
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function TourOverlay() {
  const tour = useTour();
  const { demo } = useStore();
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [missing, setMissing] = useState(false);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [tipH, setTipH] = useState(240);

  useEffect(() => {
    const h = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Track the target element every frame (handles route changes, drawers, scroll, layout shifts).
  useEffect(() => {
    if (!tour.active) return;
    let raf = 0;
    let scrolled = false;
    const t0 = performance.now();
    setMissing(false);
    const loop = () => {
      const el = findTarget(tour.target);
      if (el) {
        const r = el.getBoundingClientRect();
        if (!scrolled) {
          scrolled = true;
          const mobile = window.innerWidth < 640;
          const fixed = getComputedStyle(el).position === 'fixed' || el.closest('[role="dialog"]');
          if (!fixed) el.scrollIntoView({ block: mobile || r.height > window.innerHeight * 0.55 ? 'start' : 'center', behavior: reduce() ? 'auto' : 'smooth' });
        }
        setRect((p) =>
          p && Math.abs(p.top - r.top) < 0.5 && Math.abs(p.left - r.left) < 0.5 && Math.abs(p.width - r.width) < 0.5 && Math.abs(p.height - r.height) < 0.5
            ? p
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
        setMissing(false);
      } else if (performance.now() - t0 > 1500) {
        setMissing(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tour.active, tour.target, tour.index]);

  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  });

  useEffect(() => {
    if (!tour.active) return;
    nextRef.current?.focus({ preventScroll: true });
  }, [tour.active, tour.index]);

  useEffect(() => {
    if (!tour.active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        tour.exit();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [tour]);

  if (!tour.active) return null;
  const step = TOUR_STEPS[tour.index];
  const hole = rect && !missing ? clip(rect, vw, vh) : null;

  // Tooltip placement
  const mobile = vw < 640;
  const W = Math.min(360, vw - 32);
  let style: React.CSSProperties;
  if (mobile || !hole) {
    style = mobile ? { left: 16, right: 16, bottom: 68 } : { left: (vw - W) / 2, top: Math.max(16, (vh - tipH) / 2), width: W };
  } else {
    const below = vh - (hole.top + hole.height) - 16;
    const above = hole.top - 16;
    const right = vw - (hole.left + hole.width) - 16;
    const left = hole.left - 16;
    const clampX = (x: number) => Math.max(16, Math.min(vw - W - 16, x));
    const clampY = (y: number) => Math.max(16, Math.min(vh - tipH - 16, y));
    if (right >= W + 8 && hole.height > vh * 0.5) style = { left: hole.left + hole.width + 16, top: clampY(hole.top + 24), width: W };
    else if (left >= W + 8 && hole.height > vh * 0.5) style = { left: hole.left - W - 16, top: clampY(hole.top + 24), width: W };
    else if (below >= tipH + 8) style = { left: clampX(hole.left), top: hole.top + hole.height + 14, width: W };
    else if (above >= tipH + 8) style = { left: clampX(hole.left), top: hole.top - tipH - 14, width: W };
    else if (right >= W + 8) style = { left: hole.left + hole.width + 16, top: clampY(hole.top), width: W };
    else if (left >= W + 8) style = { left: hole.left - W - 16, top: clampY(hole.top), width: W };
    else style = { right: 24, top: 72, width: W };
  }

  const last = tour.index === TOUR_STEPS.length - 1;
  return (
    <>
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-xl ring-2 ring-brand-500 transition-all duration-300 ease-out"
          style={{
            top: hole.top - PAD,
            left: hole.left - PAD,
            width: hole.width + PAD * 2,
            height: hole.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.48), 0 0 0 6px rgba(53, 95, 245, 0.18)',
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] animate-fade-in bg-gray-900/40" />
      )}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        style={style}
        className={cx('fixed z-[65] animate-pop-in rounded-2xl bg-white p-5 shadow-pop ring-1 ring-black/5', !mobile && 'transition-[top,left] duration-300 ease-out')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-700">
              Step {tour.index + 1} of {TOUR_STEPS.length}
            </span>
            <div className="flex gap-1" aria-hidden>
              {TOUR_STEPS.map((s, i) => (
                <span key={s.id} className={cx('h-1 rounded-full transition-all duration-300', i === tour.index ? 'w-4 bg-brand-600' : i < tour.index ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-gray-200')} />
              ))}
            </div>
          </div>
          <button aria-label="Exit tour" onClick={() => tour.exit()} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-title" className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{step.body}</p>
        <p className="mt-2 flex gap-1.5 text-xs text-muted">
          <PlayCircle className="mt-px size-3.5 shrink-0 text-brand-500" />
          {step.action}
        </p>
        {missing && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">This element isn’t visible at the current screen size — continue with Next.</p>}
        {demo.founderNotes && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
              <Lightbulb className="size-3" /> Founder note
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900">{step.founderNote}</p>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={() => tour.exit()} className="text-[13px] font-medium text-muted hover:text-ink">
            Skip tour
          </button>
          <div className="flex gap-2">
            <Button size="sm" onClick={tour.back} disabled={tour.index === 0} icon={<ArrowLeft className="size-3.5" />} aria-label="Previous step">
              Back
            </Button>
            <Button ref={nextRef} size="sm" variant="primary" onClick={tour.next} aria-label={last ? 'Finish tour' : 'Next step'}>
              {last ? 'Finish' : 'Next'}
              {!last && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function clip(r: { top: number; left: number; width: number; height: number }, vw: number, vh: number) {
  const top = Math.max(8, r.top);
  const left = Math.max(8, r.left);
  const bottom = Math.min(vh - 8, r.top + r.height);
  const right = Math.min(vw - 8, r.left + r.width);
  if (bottom <= top || right <= left) return null;
  return { top, left, width: right - left, height: bottom - top };
}

// ---- Guide panel ------------------------------------------------------------------------------

export function GuidePanel() {
  const tour = useTour();
  const { demo, ui, setUi, dispatch, toast } = useStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const open = ui.guideOpen;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setUi({ guideOpen: false });
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, setUi]);

  return (
    <>
      <div className="fixed right-4 bottom-4 z-[64] sm:right-6 sm:bottom-6">
        {open && (
          <div ref={panelRef} role="dialog" aria-label="Beacon guide" className="absolute right-0 bottom-12 w-[min(340px,calc(100vw-32px))] animate-pop-in overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-black/5">
            <div className="flex items-start justify-between border-b border-line px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Beacon guide</div>
                <div className="text-xs text-muted">Tour steps use a prepared demo scenario.</div>
              </div>
              <button aria-label="Close guide" onClick={() => setUi({ guideOpen: false })} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3">
              <Button variant="primary" className="w-full" icon={<PlayCircle className="size-4" />} onClick={() => tour.start()}>
                {tour.active ? 'Restart the 2-minute tour' : 'Start the 2-minute tour'}
              </Button>
            </div>
            <ol className="scrollbar-thin max-h-[42vh] overflow-y-auto px-2 pb-2">
              {TOUR_STEPS.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => tour.goTo(i)}
                    className={cx('flex w-full gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50', tour.active && tour.index === i && 'bg-brand-50/70')}
                  >
                    <span className={cx('mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', tour.active && tour.index === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-snug font-medium text-ink">{s.title}</span>
                      {demo.founderNotes && <span className="mt-0.5 block text-xs leading-snug text-amber-800">{s.founderNote}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="space-y-2.5 border-t border-line px-4 py-3">
              <label className="flex items-center justify-between gap-2 text-[13px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="size-4 text-amber-600" /> Founder notes
                </span>
                <Switch checked={demo.founderNotes} onChange={(v) => dispatch({ type: 'setFounderNotes', on: v })} label="Show founder notes" />
              </label>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" icon={<RotateCcw className="size-3.5" />} onClick={() => { setConfirm(true); setUi({ guideOpen: false }); }}>
                  Reset demo
                </Button>
                {tour.active && (
                  <Button size="sm" className="flex-1" onClick={() => tour.exit()}>
                    Exit tour
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setUi({ guideOpen: !open })}
          aria-expanded={open}
          className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-white shadow-pop hover:bg-gray-800"
        >
          <Compass className="size-4" /> Guide
        </button>
      </div>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
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
    </>
  );
}

// ---- Welcome ----------------------------------------------------------------------------------

export function WelcomeModal() {
  const { demo, dispatch } = useStore();
  const tour = useTour();
  const open = !demo.welcomeSeen && !tour.active;
  return (
    <Modal open={open} onClose={() => dispatch({ type: 'setWelcomeSeen' })} label="Welcome to Beacon" width={520}>
      <div className="p-7 sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="7" opacity=".45" />
            <circle cx="12" cy="12" r="10.5" opacity=".2" />
          </svg>
        </div>
        <div className="mt-5 text-xs font-semibold tracking-wide text-brand-700 uppercase">Per Diem Beacon</div>
        <h2 className="mt-1.5 text-[22px] leading-tight font-semibold tracking-[-0.01em]">Your customers are ordering through AI. Keep them yours.</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Meet Beacon: a new way to understand AI-driven orders, improve storefront discovery, and turn first-time diners into loyal app customers.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" className="h-10 sm:flex-1" onClick={() => tour.start()} icon={<PlayCircle className="size-4" />}>
            Start the 2-minute tour
          </Button>
          <Button className="h-10 sm:flex-1" onClick={() => dispatch({ type: 'setWelcomeSeen' })}>
            Explore on my own
          </Button>
        </div>
        <p className="mt-5 text-xs text-subtle">Concept prototype with fictional data. Nothing is sent or synced.</p>
      </div>
    </Modal>
  );
}
