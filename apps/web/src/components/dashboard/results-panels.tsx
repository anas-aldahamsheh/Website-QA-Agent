import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Bug, CheckCircle, ChevronDown, FileText, Gauge, Search, Terminal, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { updateIssueStatusFormAction } from '@/app/actions';
import { RunStopButton } from '@/components/dashboard/run-stop-button';
import { CountUp, Reveal, RevealItem } from '@/components/motion/primitives';
import { dashboardUrl, type DashboardAuditLog, type DashboardIssue, type DashboardMetric, type DashboardRun, type DashboardRunEvent, type DashboardSearchParams } from '@/server/queries/dashboard';
import type { DashboardCopy } from './dashboard-copy';
import { FormSelect } from './form-select';
import { ResultsTabs } from './results-tabs';
import { StatusChip, toneFor } from './status-chip';

type ResultsOverviewPanelProps = {
  runs: DashboardRun[];
  issues: DashboardIssue[];
  issueCountByCategory: Record<string, number>;
  issueCountBySeverity: Record<string, number>;
  statusCounts: Record<string, number>;
  categories: string[];
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
};

type RunLogsPanelProps = {
  runs: DashboardRun[];
  events: DashboardRunEvent[];
  copy: DashboardCopy;
};

type IssuesPanelProps = {
  issues: DashboardIssue[];
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
};

type MetricsPanelProps = {
  metrics: DashboardMetric[];
  auditLogs: DashboardAuditLog[];
  copy: DashboardCopy;
};

type ResultsWorkspaceHeaderProps = {
  selectedRun: DashboardRun | undefined;
  activeSection: string;
  totalRuns: number;
  activeRuns: number;
  failedRuns: number;
  openIssues: number;
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
};

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export function ResultsWorkspaceHeader({
  selectedRun,
  activeSection,
  totalRuns,
  activeRuns,
  failedRuns,
  openIssues,
  searchParams,
  copy
}: ResultsWorkspaceHeaderProps) {
  const sections = [
    ['overview', copy.sectionOverview],
    ['live', copy.sectionLive],
    ['logs', copy.sectionLogs],
    ['issues', copy.sectionIssues],
    ['metrics', copy.sectionMetrics]
  ] as const;

  return (
    <Reveal as="section" className="panel overflow-hidden">
      <div className="grid gap-6 border-b border-border p-5 md:p-7 xl:grid-cols-[minmax(0,1fr)_440px]">
        <RevealItem className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip value={selectedRun?.status ?? 'NO_RUN'} />
            <span className="chip">{selectedRun ? selectedRun.id.slice(0, 8) : 'no-run'}</span>
            {selectedRun ? <span className="chip">{selectedRun.scanMode}</span> : null}
            {selectedRun ? <RunStopButton runId={selectedRun.id} status={selectedRun.status} size="sm" /> : null}
          </div>
          <h2 className="mt-4 truncate font-mono text-2xl font-medium tracking-tight md:text-3xl" dir="ltr">
            {selectedRun?.environment.targetUrl ?? 'No selected target'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{copy.workspaceBody}</p>
        </RevealItem>

        <RevealItem className="grid grid-cols-2 gap-2">
          <CompactMetric label={copy.runs} value={totalRuns} icon={<CheckCircle className="h-4 w-4" />} tone="var(--primary)" />
          <CompactMetric label={copy.running} value={activeRuns} icon={<Activity className="h-4 w-4" />} tone="var(--accent)" />
          <CompactMetric label={copy.review} value={failedRuns} icon={<AlertTriangle className="h-4 w-4" />} tone="var(--sev-high)" />
          <CompactMetric label={copy.openIssues} value={openIssues} icon={<Bug className="h-4 w-4" />} tone="var(--sev-critical)" />
        </RevealItem>
      </div>

      <ResultsTabs
        active={activeSection}
        tabs={sections.map(([key, label]) => ({ key, label, href: dashboardUrl('/results', { section: key }, searchParams) }))}
      />
    </Reveal>
  );
}

export function ResultsOverviewPanel({
  runs,
  issues,
  issueCountByCategory,
  issueCountBySeverity,
  statusCounts,
  categories,
  searchParams,
  copy
}: ResultsOverviewPanelProps) {
  const severityTotal = SEVERITIES.reduce((sum, severity) => sum + (issueCountBySeverity[severity] ?? 0), 0);
  const found = categories.filter((category) => (issueCountByCategory[category] ?? 0) > 0).sort((left, right) => (issueCountByCategory[right] ?? 0) - (issueCountByCategory[left] ?? 0));
  const clear = categories.filter((category) => (issueCountByCategory[category] ?? 0) === 0);
  const maxCategory = Math.max(1, ...found.map((category) => issueCountByCategory[category] ?? 0));

  return (
    <section className="space-y-4">
      <Reveal className="grid gap-3 md:grid-cols-3">
        <RevealItem><ResultTile label={copy.runs} value={runs.length} icon={<CheckCircle className="h-4 w-4" />} tone="var(--primary)" /></RevealItem>
        <RevealItem><ResultTile label={copy.issueCenter} value={issues.length} icon={<Bug className="h-4 w-4" />} tone="var(--sev-critical)" /></RevealItem>
        <RevealItem><ResultTile label={copy.needsReview} value={(statusCounts['FAILED'] ?? 0) + (statusCounts['PARTIALLY_COMPLETED'] ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} tone="var(--sev-high)" /></RevealItem>
      </Reveal>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Reveal className="panel p-5 md:p-6">
          <h2 className="text-lg font-semibold tracking-tight">{copy.resultOrganization}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.resultOrganizationBody}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {found.map((category) => {
              const count = issueCountByCategory[category] ?? 0;
              return (
                <RevealItem key={category}>
                  <a href={dashboardUrl('/results', { category }, searchParams)} className="panel-inset group relative block overflow-hidden p-4 transition-colors hover:border-primary/50">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">{category.replaceAll('_', ' ')}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:text-primary" />
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <CountUp value={count} className="font-mono text-3xl font-medium" />
                      <span className="mb-1.5 h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span className="block h-full origin-left rounded-full bg-primary transition-transform duration-1000 ease-out-expo" style={{ transform: `scaleX(${count / maxCategory})` }} />
                      </span>
                    </div>
                  </a>
                </RevealItem>
              );
            })}
          </div>
          {clear.length > 0 ? (
            <div className="mt-4">
              <div className="eyebrow mb-2 flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-ok" />
                {copy.noIssuesInCategory} · {clear.length}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clear.map((category) => (
                  <a key={category} href={dashboardUrl('/results', { category }, searchParams)} className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80 transition-colors hover:border-ok/50 hover:text-foreground">
                    {category.replaceAll('_', ' ')} <span className="text-ok">0</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </Reveal>

        <Reveal className="panel p-5 md:p-6" delay={0.08}>
          <h2 className="text-lg font-semibold tracking-tight">{copy.severityMix}</h2>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-secondary" aria-hidden>
            {SEVERITIES.map((severity) => {
              const count = issueCountBySeverity[severity] ?? 0;
              return count > 0 ? (
                <span key={severity} className="h-full border-e-2 border-card last:border-e-0" style={{ width: `${(count / Math.max(1, severityTotal)) * 100}%`, background: `hsl(${toneFor(severity)})` }} />
              ) : null;
            })}
          </div>
          <div className="mt-5 space-y-2">
            {SEVERITIES.map((severity) => {
              const count = issueCountBySeverity[severity] ?? 0;
              const tone = toneFor(severity);
              return (
                <RevealItem key={severity}>
                  <a
                    href={dashboardUrl('/results', { severity }, searchParams)}
                    className="panel-inset group flex items-center gap-4 px-4 py-3 transition-colors hover:border-[color:var(--hover)]"
                    style={{ ['--hover' as string]: `hsl(${tone} / 0.6)` }}
                  >
                    <span className="h-8 w-1 rounded-full" style={{ background: `hsl(${tone})`, boxShadow: `0 0 12px hsl(${tone} / 0.6)` }} />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{severity}</span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-secondary">
                        <span className="block h-full origin-left rounded-full transition-transform duration-1000 ease-out-expo" style={{ transform: `scaleX(${count / Math.max(1, severityTotal)})`, background: `hsl(${tone})` }} />
                      </span>
                    </span>
                    <CountUp value={count} className="w-10 text-end font-mono text-2xl font-medium" />
                  </a>
                </RevealItem>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function RunLogsPanel({ runs, events, copy }: RunLogsPanelProps) {
  return (
    <Reveal as="section" className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
        <Terminal className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">{copy.inspectionLogs}</h2>
      </div>
      <div className="space-y-4 p-4 md:p-6">
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noRunLogs}</p>
        ) : (
          runs.map((run) => (
            <RevealItem key={run.id} className="overflow-hidden rounded-xl border border-border bg-background/80">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex gap-1" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-sev-critical/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-sev-medium/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">Run ID: {run.id.slice(0, 8)}</span>
                </div>
                <StatusChip value={run.status} />
              </div>
              <div className="px-4 pt-3 font-mono text-xs text-foreground" dir="ltr">Target URL: {run.environment.targetUrl}</div>
              <div className="max-h-80 overflow-auto p-4 font-mono text-xs" data-lenis-prevent dir="ltr">
                {run.caseRuns.map((caseRun) => (
                  <div key={caseRun.id} className="mb-4">
                    <div className="mb-2 font-semibold text-primary">› {caseRun.name}</div>
                    {caseRun.stepRuns.map((step, index) => (
                      <div key={step.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 rounded px-1 py-1 hover:bg-secondary/50">
                        <span className="text-muted-foreground/50">{String(index + 1).padStart(2, '0')}</span>
                        <span className="truncate text-muted-foreground">
                          {step.action}
                          {step.target ? ` (${step.target})` : ''}
                        </span>
                        <span className={step.status === 'PASSED' ? 'text-ok' : 'text-sev-critical'}>{step.status}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </RevealItem>
          ))
        )}
      </div>

      {events.length > 0 ? (
        <div className="border-t border-border p-4 md:p-6">
          <h3 className="eyebrow mb-4">{copy.recentEvents}</h3>
          <ol className="relative space-y-3 border-s border-border ps-5">
            {events.slice(0, 12).map((event) => (
              <RevealItem key={event.id}>
                <li className="relative">
                  <span className="absolute -start-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-card" style={{ background: `hsl(${event.type === 'ERROR' ? 'var(--sev-critical)' : event.type === 'WARNING' ? 'var(--sev-medium)' : event.type === 'STATE_CHANGE' ? 'var(--accent)' : 'var(--primary)'})` }} />
                  <div className="flex flex-wrap justify-between gap-3 text-xs">
                    <span className="font-mono font-semibold">{event.type}</span>
                    <span className="font-mono text-muted-foreground">{event.createdAt.toISOString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{event.message}</p>
                </li>
              </RevealItem>
            ))}
          </ol>
        </div>
      ) : null}
    </Reveal>
  );
}

// Issue text from the scanner carries a plain summary first and machine details after it.
function splitIssueDescription(description: string): { summary: string; details: string } {
  const marker = description.indexOf('\n\nfingerprint=');
  if (marker === -1) return { summary: description, details: '' };
  return { summary: description.slice(0, marker), details: description.slice(marker + 2) };
}

export function IssuesPanel({ issues, searchParams, copy }: IssuesPanelProps) {
  return (
    <Reveal as="section" className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">{copy.issueCenter}</h2>
            <span className="chip">{issues.length}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.issueCenterBody}</p>
        </div>
        <form className="flex gap-2" action="/results">
          <input type="hidden" name="runId" value={searchParams.runId ?? ''} />
          <input type="hidden" name="section" value="issues" />
          <input type="hidden" name="category" value={searchParams.category ?? 'ALL'} />
          <input type="hidden" name="severity" value={searchParams.severity ?? 'ALL'} />
          <input type="hidden" name="status" value={searchParams.status ?? 'ALL'} />
          <input type="hidden" name="page" value={searchParams.page ?? 'ALL'} />
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field w-56 ps-9" name="q" defaultValue={searchParams.q ?? ''} placeholder={copy.searchIssues} />
          </label>
          <button className="btn-primary h-[42px] px-4">{copy.search}</button>
        </form>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {issues.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{copy.noMatchingIssues}</p>
        ) : (
          issues.map((issue) => {
            const tone = toneFor(issue.severity);
            const { summary, details } = splitIssueDescription(issue.description);
            return (
              <RevealItem key={issue.id}>
                <article className="group relative overflow-hidden rounded-xl border border-border bg-background/60 transition-colors hover:border-[color:var(--hover)]" style={{ ['--hover' as string]: `hsl(${tone} / 0.5)` }}>
                  <span aria-hidden className="absolute inset-y-0 start-0 w-[3px]" style={{ background: `hsl(${tone})`, boxShadow: `0 0 18px hsl(${tone} / 0.8)` }} />
                  <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, hsl(${tone} / 0.06), transparent 40%)` }} />
                  <div className="relative p-4 ps-6 md:p-5 md:ps-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusChip value={issue.severity} />
                          <span className="chip">{issue.category.replaceAll('_', ' ')}</span>
                          <StatusChip value={issue.status} />
                        </div>
                        <h3 className="mt-3 break-words text-base font-semibold leading-snug md:text-lg">{issue.title}</h3>
                        <p className="mt-2 max-w-full whitespace-pre-line break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{summary}</p>
                      </div>
                      <form action={updateIssueStatusFormAction} className="flex gap-2">
                        <input type="hidden" name="issueId" value={issue.id} />
                        <FormSelect
                          name="status"
                          defaultValue={issue.status}
                          ariaLabel={copy.status}
                          className="w-36"
                          options={[
                            { value: 'OPEN', label: 'Open' },
                            { value: 'ASSIGNED', label: 'Assigned' },
                            { value: 'RESOLVED', label: 'Resolved' },
                            { value: 'IGNORED', label: 'Ignored' }
                          ]}
                        />
                        <button className="btn-ghost h-10">{copy.update}</button>
                      </form>
                    </div>
                    {issue.suggestedFix ? (
                      <div className="mt-4 flex max-w-full gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm [overflow-wrap:anywhere]">
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <div className="eyebrow mb-1 text-primary/90">{copy.suggestedFix}</div>
                          <p className="break-words text-foreground/90">{issue.suggestedFix}</p>
                        </div>
                      </div>
                    ) : null}
                    {issue.occurrences.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="eyebrow">{copy.evidence}</span>
                        {issue.occurrences.map((occurrence) => (
                          <span key={occurrence.id} className="max-w-full break-words rounded-md border border-border bg-card px-2 py-1 font-mono text-[10.5px] [overflow-wrap:anywhere]" dir="ltr">
                            {occurrence.browser} / {occurrence.device} / {occurrence.evidencePath ?? 'no artifact'}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {details ? (
                      <details className="group/details mt-3">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-open/details:rotate-180" />
                          {copy.technicalDetails}
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-3 font-mono text-[11px] leading-5 text-muted-foreground [overflow-wrap:anywhere]" data-lenis-prevent dir="ltr">{details}</pre>
                      </details>
                    ) : null}
                  </div>
                </article>
              </RevealItem>
            );
          })
        )}
      </div>
    </Reveal>
  );
}

export function MetricsPanel({ metrics, auditLogs, copy }: MetricsPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Reveal className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">{copy.metrics}</h2>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 md:p-5">
          {metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noMetrics}</p>
          ) : (
            metrics.map((metric) => (
              <RevealItem key={metric.id}>
                <div className="panel-inset px-4 py-3">
                  <div className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{metric.name}</div>
                  <div className="mt-1 font-mono text-xl font-medium tabular-nums">{metric.value.toFixed(2)}</div>
                </div>
              </RevealItem>
            ))
          )}
        </div>
      </Reveal>

      <Reveal className="panel overflow-hidden" delay={0.08}>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-6">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">{copy.auditTrail}</h2>
        </div>
        <div className="p-4 md:p-6">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noAuditEvents}</p>
          ) : (
            <ol className="relative space-y-4 border-s border-border ps-5">
              {auditLogs.map((log) => (
                <RevealItem key={log.id}>
                  <li className="relative">
                    <span className="absolute -start-[25px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
                    <div className="flex flex-wrap justify-between gap-3">
                      <span className="text-sm font-semibold">{log.action}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{log.createdAt.toISOString()}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {log.entityType} / {log.entityId ?? 'unscoped'}
                    </div>
                  </li>
                </RevealItem>
              ))}
            </ol>
          )}
        </div>
      </Reveal>
    </section>
  );
}

function CompactMetric({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  return (
    <div className="panel-inset p-3.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span style={{ color: `hsl(${tone})` }}>{icon}</span>
      </div>
      <CountUp value={value} className="mt-2 block font-mono text-3xl font-medium" />
    </div>
  );
}

function ResultTile({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border" style={{ color: `hsl(${tone})`, borderColor: `hsl(${tone} / 0.35)`, background: `hsl(${tone} / 0.08)` }}>{icon}</span>
      </div>
      <CountUp value={value} className="mt-4 block font-mono text-5xl font-medium leading-none" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, hsl(${tone} / 0.7), transparent)` }} />
    </div>
  );
}
