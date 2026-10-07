'use client';

import { Crosshair, Loader2, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Magnetic, easeOutExpo } from '@/components/motion/primitives';

function parseTarget(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url;
  } catch {
    return null;
  }
}

// Server and browser can differ in the last digits of trigonometry; rounding keeps the markup identical.
function round(value: number) {
  return Math.round(value * 100) / 100;
}

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

type TargetComposerProps = {
  label: React.ReactNode;
  defaultValue?: string | undefined;
  readouts: { protocol: string; host: string; path: string; status: string; idle: string; locked: string };
};

// The address field and its scope. While the visitor types, the scope searches; a valid address
// makes the reticle close in and lock on the host.
export function TargetComposer({ label, defaultValue, readouts }: TargetComposerProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue ?? '');
  const [typing, setTyping] = useState(false);
  const target = useMemo(() => parseTarget(value), [value]);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!typing) return;
    const timer = window.setTimeout(() => setTyping(false), 600);
    return () => window.clearTimeout(timer);
  }, [typing, value]);

  const seed = target ? hash(target.hostname) : 0;
  const blips = useMemo(
    () =>
      Array.from({ length: target ? 7 : 4 }, (_, index) => {
        const angle = ((seed >> (index * 3)) % 360) * (Math.PI / 180) + index * 1.7;
        const radius = 22 + (((seed >> (index * 2)) % 60) + index * 9) % 62;
        return { x: round(100 + Math.cos(angle) * radius), y: round(100 + Math.sin(angle) * radius), delay: index * 0.35 };
      }),
    [seed, target]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
      <div className="min-w-0">
        <label htmlFor={inputId} className="block">{label}</label>
        <div className="corner-frame mt-3 rounded-xl">
          <div className="relative flex items-center gap-3 rounded-xl border border-input bg-background/80 px-4 transition-[border-color,box-shadow] duration-300 focus-within:border-primary focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),0_0_60px_-20px_hsl(var(--primary)/0.6)]">
            <Crosshair className={`h-5 w-5 shrink-0 transition-colors duration-500 ${target ? 'text-primary' : 'text-muted-foreground'}`} />
            <input
              id={inputId}
              className="h-16 w-full min-w-0 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-2xl"
              name="targetUrl"
              type="url"
              placeholder="https://example.com"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setTyping(true);
              }}
              required
              dir="ltr"
              spellCheck={false}
              autoComplete="url"
            />
            <AnimatePresence>
              {target ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="chip hidden shrink-0 border-primary/40 bg-primary/10 text-primary sm:inline-flex"
                >
                  {readouts.locked}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]" dir="ltr">
          {[
            [readouts.protocol, target ? target.protocol.replace(':', '').toUpperCase() : '—'],
            [readouts.host, target ? target.hostname : '—'],
            [readouts.path, target ? target.pathname : '—']
          ].map(([name, text]) => (
            <div key={name} className="panel-inset min-w-0 px-3 py-2">
              <dt className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{name}</dt>
              <dd className="mt-1 truncate text-foreground">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={text} className="block truncate" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.25 }}>
                    {text}
                  </motion.span>
                </AnimatePresence>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[240px]" aria-hidden>
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
          {[90, 66, 42, 18].map((radius) => (
            <circle key={radius} cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
          ))}
          <path d="M100 6V194M6 100H194" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 4" />
          {Array.from({ length: 36 }, (_, index) => {
            const angle = (index * 10 * Math.PI) / 180;
            const inner = index % 3 === 0 ? 84 : 87;
            return (
              <line key={index} x1={round(100 + Math.cos(angle) * inner)} y1={round(100 + Math.sin(angle) * inner)} x2={round(100 + Math.cos(angle) * 90)} y2={round(100 + Math.sin(angle) * 90)} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.5" strokeWidth="1" />
            );
          })}
          {blips.map((blip, index) => (
            <motion.circle
              key={`${seed}-${index}`}
              cx={blip.x}
              cy={blip.y}
              r="2.6"
              fill={target ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0.25], scale: [0, 1.4, 1] }}
              transition={{ duration: 2.4, delay: blip.delay, repeat: Infinity, repeatDelay: 1.2 }}
            />
          ))}
        </svg>
        <div
          className="absolute inset-[5%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,hsl(var(--primary)/0.05)_300deg,hsl(var(--primary)/0.45)_360deg)]"
          style={{ animation: `sweep ${pending ? 0.8 : typing ? 1.6 : 4.2}s linear infinite` }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-md border-2 border-primary"
          style={{ x: '-50%', y: '-50%' }}
          animate={target ? { width: 54, height: 54, opacity: 1, rotate: 0 } : { width: 150, height: 150, opacity: 0.25, rotate: 45 }}
          transition={{ duration: 0.9, ease: easeOutExpo }}
        />
        <div className="absolute inset-x-0 -bottom-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground" dir="ltr">
          {readouts.status}: <span className={target ? 'text-primary' : ''}>{target ? readouts.locked : readouts.idle}</span>
        </div>
      </div>
    </div>
  );
}

// Scan mode as a segmented control built on real radio inputs, so the form posts it as before.
export function ModeSelector({ name, defaultValue, options, label }: { name: string; defaultValue: string; options: { value: string; label: string; hint: string }[]; label: React.ReactNode }) {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <fieldset>
      <legend className="mb-3">{label}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/70 p-1">
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <label key={option.value} className={`relative cursor-pointer rounded-lg px-3 py-2.5 text-center transition-colors ${active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <input type="radio" name={name} value={option.value} checked={active} onChange={() => setSelected(option.value)} className="peer sr-only" />
              {active ? <motion.span layoutId={`mode-${name}`} className="absolute inset-0 rounded-lg bg-primary shadow-[0_8px_30px_-10px_hsl(var(--glow))]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
              <span className="relative block text-sm font-semibold">{option.label}</span>
              <span className={`relative mt-0.5 block font-mono text-[9.5px] uppercase tracking-widest ${active ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{option.hint}</span>
              <span className="pointer-events-none absolute inset-0 rounded-lg ring-primary peer-focus-visible:ring-2" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// The launch button: leans toward the pointer, and while the scan is being created it turns into
// a striped loading bar with a spinner.
export function LaunchButton({ label, launching }: { label: string; launching: string }) {
  const { pending } = useFormStatus();
  return (
    <Magnetic strength={0.2}>
      <button type="submit" disabled={pending} className="btn-primary h-14 min-w-[220px] px-7 text-base disabled:cursor-wait">
        {pending ? <span aria-hidden className="progress-stripes absolute inset-0" /> : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={pending ? 'pending' : 'idle'}
            className="relative inline-flex items-center gap-2.5"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
            {pending ? launching : label}
          </motion.span>
        </AnimatePresence>
      </button>
    </Magnetic>
  );
}
