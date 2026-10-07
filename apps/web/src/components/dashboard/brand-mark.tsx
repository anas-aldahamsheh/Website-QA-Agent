// The product mark: a scope with a sweeping beam that settles on a check. Pure SVG and CSS, so it
// animates everywhere without script.
export function BrandMark({ size = 40, live = true }: { size?: number; live?: boolean }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-primary/40 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.22),hsl(var(--card))_70%)]"
      style={{ width: size, height: size }}
    >
      {live ? (
        <span
          aria-hidden
          className="animate-sweep absolute inset-[-30%] bg-[conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary)/0.55)_40deg,transparent_70deg)]"
        />
      ) : null}
      <svg viewBox="0 0 40 40" className="relative h-[70%] w-[70%]" aria-hidden>
        <circle cx="20" cy="20" r="15" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="20" cy="20" r="9" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="1" />
        <path d="M20 3v5M20 32v5M3 20h5M32 20h5" stroke="hsl(var(--primary))" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14.5 20.5l3.8 3.8 7.4-8" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
