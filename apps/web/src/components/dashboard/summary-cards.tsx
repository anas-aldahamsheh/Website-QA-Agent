import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { DashboardCopy } from './dashboard-copy';

type SummaryCardsProps = {
  copy: DashboardCopy;
  totalRuns: number;
  activeRuns: number;
  failedRuns: number;
  openIssues: number;
};

const cardBase = 'rounded-md border border-border bg-card p-4';

export function SummaryCards({ copy, totalRuns, activeRuns, failedRuns, openIssues }: SummaryCardsProps) {
  const cards = [
    { label: copy.totalRuns, value: totalRuns, icon: CheckCircle },
    { label: copy.runningNow, value: activeRuns, icon: Activity },
    { label: copy.needsReview, value: failedRuns, icon: AlertTriangle },
    { label: copy.openIssues, value: openIssues, icon: Clock }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={cardBase}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{card.value}</div>
          </div>
        );
      })}
    </section>
  );
}
