import { Activity, AlertTriangle, BarChart3, Bug, CheckCircle, FileText, Gauge, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';
import { updateIssueStatusFormAction } from '@/app/actions';
import { RunStopButton } from '@/components/dashboard/run-stop-button';
import { dashboardUrl, type DashboardAuditLog, type DashboardIssue, type DashboardMetric, type DashboardRun, type DashboardRunEvent, type DashboardSearchParams } from '@/server/queries/dashboard';
import type { DashboardCopy } from './dashboard-copy';
import { FormSelect } from './form-select';

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

const workspaceSections = [
  ['overview', 'Overview'],
  ['live', 'Live progress'],
  ['logs', 'Logs'],
  ['issues', 'Issues'],
  ['metrics', 'Metrics']
] as const;

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
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="grid gap-4 border-b border-border p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
              {selectedRun?.status ?? 'NO_RUN'}
            </span>
            <span className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
              {selectedRun ? selectedRun.id.slice(0, 8) : 'no-run'}
            </span>
            {selectedRun ? (
              <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{selectedRun.scanMode}</span>
            ) : null}
            {selectedRun ? <RunStopButton runId={selectedRun.id} status={selectedRun.status} size="sm" /> : null}
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold">{selectedRun?.environment.targetUrl ?? 'No selected target'}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {copy.workspaceBody}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CompactMetric label={copy.runs} value={totalRuns} icon={<CheckCircle className="h-4 w-4" />} />
          <CompactMetric label={copy.running} value={activeRuns} icon={<Activity className="h-4 w-4" />} />
          <CompactMetric label={copy.review} value={failedRuns} icon={<AlertTriangle className="h-4 w-4" />} />
          <CompactMetric label={copy.openIssues} value={openIssues} icon={<Bug className="h-4 w-4" />} />
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto p-3" aria-label="Results sections">
        {workspaceSections.map(([key, label]) => (
          <a
            key={key}
            href={dashboardUrl('/results', { section: key }, searchParams)}
            className={`inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-semibold ${
              activeSection === key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
            }`}
          >
            {label}
          </a>
        ))}
      </nav>
    </section>
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
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ResultTile label={copy.runs} value={runs.length} icon={<CheckCircle className="h-4 w-4" />} />
        <ResultTile label={copy.issueCenter} value={issues.length} icon={<Bug className="h-4 w-4" />} />
        <ResultTile label={copy.needsReview} value={(statusCounts['FAILED'] ?? 0) + (statusCounts['PARTIALLY_COMPLETED'] ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{copy.resultOrganization}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.resultOrganizationBody}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <a key={category} href={dashboardUrl('/results', { category }, searchParams)} className="rounded-md border border-border bg-background p-3">
                <div className="text-sm font-semibold">{category}</div>
                <div className="mt-2 text-2xl font-semibold">{issueCountByCategory[category] ?? 0}</div>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{copy.severityMix}</h2>
          <div className="mt-4 space-y-3">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
              <a
                key={severity}
                href={dashboardUrl('/results', { severity }, searchParams)}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
              >
                <span className="text-sm">{severity}</span>
                <span className="font-semibold">{issueCountBySeverity[severity] ?? 0}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RunLogsPanel({ runs, events, copy }: RunLogsPanelProps) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">{copy.inspectionLogs}</h2>
      </div>
      <div className="mt-4 space-y-4">
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noRunLogs}</p>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-mono text-xs text-muted-foreground">Run ID: {run.id.slice(0, 8)}</div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{run.status}</span>
              </div>
              <div className="mt-2 text-sm font-semibold">Target URL: {run.environment.targetUrl}</div>
              <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-xs">
                {run.caseRuns.map((caseRun) => (
                  <div key={caseRun.id} className="mb-4">
                    <div className="mb-2 font-semibold text-foreground">{caseRun.name}</div>
                    {caseRun.stepRuns.map((step) => (
                      <div key={step.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1">
                        <span className="truncate text-muted-foreground">
                          {step.action}
                          {step.target ? ` (${step.target})` : ''}
                        </span>
                        <span className={step.status === 'PASSED' ? 'text-primary' : 'text-destructive'}>{step.status}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {events.length > 0 ? (
        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">{copy.recentEvents}</h3>
          <div className="mt-3 space-y-2">
            {events.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-md border border-border px-3 py-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{event.type}</span>
                  <span className="text-muted-foreground">{event.createdAt.toISOString()}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{event.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function IssuesPanel({ issues, searchParams, copy }: IssuesPanelProps) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">{copy.issueCenter}</h2>
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
          <input className="w-56 rounded-md border border-input bg-background px-3 py-2 text-sm" name="q" defaultValue={searchParams.q ?? ''} placeholder={copy.searchIssues} />
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{copy.search}</button>
        </form>
      </div>

      <div className="mt-4 space-y-3">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noMatchingIssues}</p>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{issue.category}</span>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{issue.severity}</span>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{issue.status}</span>
                  </div>
                  <h3 className="mt-3 break-words text-base font-semibold">{issue.title}</h3>
                  <p className="mt-2 max-w-full break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{issue.description}</p>
                </div>
                <form action={updateIssueStatusFormAction} className="flex gap-2">
                  <input type="hidden" name="issueId" value={issue.id} />
                  <FormSelect
                    name="status"
                    defaultValue={issue.status}
                    ariaLabel={copy.status}
                    className="w-40"
                    options={[
                      { value: 'OPEN', label: 'Open' },
                      { value: 'ASSIGNED', label: 'Assigned' },
                      { value: 'RESOLVED', label: 'Resolved' },
                      { value: 'IGNORED', label: 'Ignored' }
                    ]}
                  />
                  <button className="rounded-md border border-border px-3 py-2 text-sm">{copy.update}</button>
                </form>
              </div>
              {issue.suggestedFix ? <p className="mt-3 max-w-full break-words rounded-md border border-border p-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">{issue.suggestedFix}</p> : null}
              {issue.occurrences.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {issue.occurrences.map((occurrence) => (
                    <span key={occurrence.id} className="max-w-full break-words rounded-md border border-border px-2 py-1 [overflow-wrap:anywhere]">
                      {occurrence.browser} / {occurrence.device} / {occurrence.evidencePath ?? 'no artifact'}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function MetricsPanel({ metrics, auditLogs, copy }: MetricsPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">{copy.metrics}</h2>
        </div>
        <div className="mt-4 space-y-2">
          {metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noMetrics}</p>
          ) : (
            metrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                <span>{metric.name}</span>
                <span className="font-semibold">{metric.value.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">{copy.auditTrail}</h2>
        </div>
        <div className="mt-4 space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noAuditEvents}</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{log.action}</span>
                  <span className="text-xs text-muted-foreground">{log.createdAt.toISOString()}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {log.entityType} / {log.entityId ?? 'unscoped'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CompactMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ResultTile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
