const RUN_TONES: Record<string, string> = {
  COMPLETED: 'var(--ok)',
  PARTIALLY_COMPLETED: 'var(--sev-medium)',
  TIMED_OUT: 'var(--sev-medium)',
  FAILED: 'var(--sev-critical)',
  CANCELED: 'var(--sev-critical)',
  OPEN: 'var(--sev-high)',
  ASSIGNED: 'var(--accent)',
  RESOLVED: 'var(--ok)',
  IGNORED: 'var(--muted-foreground)',
  CRITICAL: 'var(--sev-critical)',
  HIGH: 'var(--sev-high)',
  MEDIUM: 'var(--sev-medium)',
  LOW: 'var(--sev-low)',
  NO_RUN: 'var(--muted-foreground)'
};

export const ACTIVE_STATUSES = ['QUEUED', 'RUNNING', 'PROVISIONING', 'DISCOVERING', 'PLANNING', 'EXECUTING', 'ANALYZING'];

export function toneFor(value: string): string {
  return RUN_TONES[value] ?? (ACTIVE_STATUSES.includes(value) ? 'var(--accent)' : 'var(--muted-foreground)');
}

// A status or severity label in its own colour; live statuses pulse.
export function StatusChip({ value, className }: { value: string; className?: string }) {
  const tone = toneFor(value);
  const live = ACTIVE_STATUSES.includes(value);
  return (
    <span
      className={`chip ${className ?? ''}`}
      style={{ color: `hsl(${tone})`, borderColor: `hsl(${tone} / 0.35)`, background: `hsl(${tone} / 0.08)` }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live ? <span className="animate-pulse-ring absolute inset-0 rounded-full" style={{ background: `hsl(${tone})` }} /> : null}
        <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${tone})` }} />
      </span>
      {value.replaceAll('_', ' ')}
    </span>
  );
}
