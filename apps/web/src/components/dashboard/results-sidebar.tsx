import { Clock, FileText, ListFilter } from 'lucide-react';
import { dashboardUrl, type DashboardRun, type DashboardSearchParams } from '@/server/queries/dashboard';
import type { DashboardCopy } from './dashboard-copy';
import { FormSelect } from './form-select';

type ResultsControlsBarProps = {
  runs: DashboardRun[];
  categories: string[];
  pages: string[];
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
};

export function ResultsControlsBar({ runs, categories, pages, searchParams, copy }: ResultsControlsBarProps) {
  const activeSection = searchParams.section ?? 'overview';
  const activeRunId = searchParams.runId ?? runs[0]?.id;
  const selectedRun = runs.find((run) => run.id === activeRunId) ?? runs[0];

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ListFilter className="h-4 w-4 text-primary" />
              {copy.filters}
            </div>
            <form action="/results" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input type="hidden" name="runId" value={activeRunId ?? ''} />
              <input type="hidden" name="section" value={activeSection} />
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">{copy.issueType}</span>
                <FormSelect
                  name="category"
                  defaultValue={searchParams.category ?? 'ALL'}
                  ariaLabel={copy.issueType}
                  options={[
                    { value: 'ALL', label: copy.allIssueTypes },
                    ...categories.map((category) => ({ value: category, label: category }))
                  ]}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">{copy.page}</span>
                <FormSelect
                  name="page"
                  defaultValue={searchParams.page ?? 'ALL'}
                  ariaLabel={copy.page}
                  options={[
                    { value: 'ALL', label: copy.allPages },
                    ...pages.map((page) => ({ value: page, label: page }))
                  ]}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">{copy.severity}</span>
                <FormSelect
                  name="severity"
                  defaultValue={searchParams.severity ?? 'ALL'}
                  ariaLabel={copy.severity}
                  options={[
                    { value: 'ALL', label: copy.allSeverities },
                    { value: 'CRITICAL', label: 'Critical' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'LOW', label: 'Low' }
                  ]}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">{copy.status}</span>
                <FormSelect
                  name="status"
                  defaultValue={searchParams.status ?? 'ALL'}
                  ariaLabel={copy.status}
                  options={[
                    { value: 'ALL', label: copy.allStatuses },
                    { value: 'OPEN', label: 'Open' },
                    { value: 'ASSIGNED', label: 'Assigned' },
                    { value: 'RESOLVED', label: 'Resolved' },
                    { value: 'IGNORED', label: 'Ignored' }
                  ]}
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
                <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">{copy.applyFilters}</button>
                <a className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm text-muted-foreground" href={dashboardUrl('/results', { category: 'ALL', page: 'ALL', severity: 'ALL', status: 'ALL' }, searchParams)}>
                  {copy.reset}
                </a>
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              {copy.selectedRun}
            </div>
            {selectedRun ? (
              <div className="rounded-md border border-border bg-background p-3">
                <div className="font-mono text-xs text-muted-foreground">{selectedRun.id.slice(0, 8)}</div>
                <div className="mt-2 truncate text-sm font-semibold">{selectedRun.environment.targetUrl}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{selectedRun.status}</span>
                  <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{selectedRun.scanMode}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.noRunSelected}</p>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              {copy.runHistory}
            </div>
            <div className="grid max-h-40 gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
              {runs.map((run) => (
                <a
                  key={run.id}
                  href={dashboardUrl('/results', { runId: run.id }, searchParams)}
                  className={`block rounded-md border border-border p-3 text-sm ${
                    activeRunId === run.id ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="block font-mono text-xs">{run.id.slice(0, 8)}</span>
                  <span className="mt-1 block truncate text-xs">{run.environment.targetUrl}</span>
                  <span className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{run.status}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ResultsSidebar(props: ResultsControlsBarProps) {
  return <ResultsControlsBar {...props} />;
}
