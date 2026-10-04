import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { useStore } from '../state/store';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

// ---- Button -----------------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: React.ComponentProps<'button'> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
        variant === 'secondary' && 'border border-line-strong bg-white text-ink shadow-[0_1px_1px_rgba(16,24,40,0.04)] hover:bg-gray-50',
        variant === 'ghost' && 'text-gray-700 hover:bg-gray-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx('inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink', className)}
    >
      {children}
    </button>
  );
}

// ---- Card / layout ---------------------------------------------------------------------------

export function Card({ className, children, ...rest }: React.ComponentProps<'div'>) {
  return (
    <div {...rest} className={cx('rounded-xl border border-line bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 px-5 pt-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, tourId }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: ReactNode; tourId?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0" data-tour={tourId}>
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Badges -----------------------------------------------------------------------------------

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet';
const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};
export function Badge({ tone = 'gray', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {children}
    </span>
  );
}

// ---- Switch / checkbox / segmented ------------------------------------------------------------

export function Switch({ checked, onChange, label, id, disabled, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; disabled?: boolean; size?: 'md' | 'lg' }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        size === 'lg' ? 'h-7 w-12' : 'h-5 w-9',
        checked ? 'bg-brand-600' : 'bg-gray-300',
      )}
    >
      <span
        className={cx(
          'inline-block rounded-full bg-white shadow transition-transform duration-200',
          size === 'lg' ? 'size-6' : 'size-4',
          checked ? (size === 'lg' ? 'translate-x-[22px]' : 'translate-x-[18px]') : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function Checkbox({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-2.5', disabled && 'cursor-not-allowed opacity-60')}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 rounded border-gray-300 accent-brand-600" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line-strong bg-gray-50 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            value === o.value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string | number>({ value, options, onChange, label, className }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const o = options.find((x) => String(x.value) === e.target.value);
        if (o) onChange(o.value);
      }}
      className={cx('h-9 rounded-lg border border-line-strong bg-white px-2.5 text-sm text-ink shadow-[0_1px_1px_rgba(16,24,40,0.04)]', className)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---- Tooltip ----------------------------------------------------------------------------------

export function InfoTip({ text, label = 'More info' }: { text: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex text-subtle hover:text-gray-600"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <span role="tooltip" className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 animate-fade-in rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed font-normal text-white shadow-pop">
          {text}
        </span>
      )}
    </span>
  );
}

// ---- Overlays ---------------------------------------------------------------------------------

function useEscape(active: boolean, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.body.dataset.tourActive) ref.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active]);
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = 520,
  tourId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  tourId?: string;
}) {
  useEscape(open, onClose);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-gray-900/25" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Details'}
        data-tour={tourId}
        style={{ width: `min(${width}px, 100vw)` }}
        className="absolute inset-y-0 right-0 flex animate-slide-in flex-col bg-white shadow-pop outline-none"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-gray-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, width = 480, label }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; label: string }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-gray-900/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={label} style={{ width: `min(${width}px, 100%)` }} className="relative max-h-[90vh] animate-pop-in overflow-y-auto rounded-2xl bg-white shadow-pop">
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel, tone = 'primary' }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel: string; tone?: 'primary' | 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} label={title} width={420}>
      <div className="p-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-muted">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Popover menu -----------------------------------------------------------------------------

export function Popover({ trigger, children, align = 'left', width = 260 }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div role="menu" style={{ width }} className={cx('absolute top-full z-40 mt-1.5 animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-pop', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItemButton({ children, onClick, icon, active }: { children: ReactNode; onClick: () => void; icon?: ReactNode; active?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-50', active && 'bg-brand-50/60 text-brand-700')}>
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

// ---- Toasts -----------------------------------------------------------------------------------

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-[70] flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2 sm:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-pop">
          {t.tone === 'info' ? <Info className="mt-0.5 size-4 shrink-0 text-brand-300" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
          <div className="min-w-0 flex-1">
            <div className="font-medium">{t.title}</div>
            {t.body && <div className="mt-0.5 text-[13px] text-gray-300">{t.body}</div>}
          </div>
          <button aria-label="Dismiss notification" onClick={() => dismissToast(t.id)} className="text-gray-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---- Animated numbers -------------------------------------------------------------------------

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useTween(target: number, duration = 700) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduceMotion()) {
      setV(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = a + (target - a) * e;
      setV(cur);
      from.current = cur;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function CountUp({ value, format, from, duration }: { value: number; format: (n: number) => string; from?: number; duration?: number }) {
  const [target, setTarget] = useState(from ?? value);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTarget(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const v = useTween(target, duration);
  return <span className="tabular">{format(v)}</span>;
}

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'green' | 'gray'; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-gray-100', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-700 ease-out', tone === 'brand' && 'bg-brand-600', tone === 'green' && 'bg-emerald-500', tone === 'gray' && 'bg-gray-400')}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-ink">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const inputCls = 'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink shadow-[0_1px_1px_rgba(16,24,40,0.04)] placeholder:text-subtle focus:border-brand-400 focus:outline-none focus:ring-3 focus:ring-brand-100';

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line-strong bg-gray-50/60 px-4 py-6 text-center text-sm text-muted">{children}</div>;
}
