import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { CountUp, Reveal, RevealItem, Tilt } from '@/components/motion/primitives';
import type { DashboardCopy } from './dashboard-copy';

type SummaryCardsProps = {
  copy: DashboardCopy;
  totalRuns: number;
  activeRuns: number;
  failedRuns: number;
  openIssues: number;
};

export function SummaryCards({ copy, totalRuns, activeRuns, failedRuns, openIssues }: SummaryCardsProps) {
  const cards = [
    { label: copy.totalRuns, value: totalRuns, icon: CheckCircle, tone: 'var(--primary)', code: 'RUN.TOTAL' },
    { label: copy.runningNow, value: activeRuns, icon: Activity, tone: 'var(--accent)', code: 'RUN.LIVE', live: activeRuns > 0 },
    { label: copy.needsReview, value: failedRuns, icon: AlertTriangle, tone: 'var(--sev-high)', code: 'RUN.REVIEW' },
    { label: copy.openIssues, value: openIssues, icon: Clock, tone: 'var(--sev-critical)', code: 'ISSUE.OPEN' }
  ];

  return (
    <Reveal as="section" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <RevealItem key={card.label}>
            <Tilt className="panel h-full overflow-hidden p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow" style={{ color: `hsl(${card.tone})` }}>{card.code}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{card.label}</div>
                </div>
                <span
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border"
                  style={{ borderColor: `hsl(${card.tone} / 0.35)`, background: `hsl(${card.tone} / 0.08)`, color: `hsl(${card.tone})` }}
                >
                  {card.live ? <span className="animate-pulse-ring absolute inset-0 rounded-lg border" style={{ borderColor: `hsl(${card.tone})` }} /> : null}
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-6 flex items-end justify-between gap-3">
                <CountUp value={card.value} className="font-mono text-5xl font-medium leading-none tracking-tight" />
                <Ticks tone={card.tone} value={card.value} />
              </div>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, hsl(${card.tone} / 0.7), transparent)` }} />
            </Tilt>
          </RevealItem>
        );
      })}
    </Reveal>
  );
}

// A row of instrument ticks; how many are lit follows the value.
function Ticks({ tone, value }: { tone: string; value: number }) {
  const lit = Math.min(12, value);
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full transition-all duration-700"
          style={{
            height: `${30 + ((index * 37) % 70)}%`,
            background: index < lit ? `hsl(${tone})` : 'hsl(var(--border))',
            transitionDelay: `${index * 40}ms`
          }}
        />
      ))}
    </div>
  );
}
