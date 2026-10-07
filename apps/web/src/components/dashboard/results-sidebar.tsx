import { Clock, FileText, ListFilter, RotateCcw } from 'lucide-react';
import { dashboardUrl, type DashboardRun, type DashboardSearchParams } from '@/server/queries/dashboard';
import { Reveal, RevealItem } from '@/components/motion/primitives';
import type { DashboardCopy } from './dashboard-copy';
import { FormSelect } from './form-select';
import { StatusChip, toneFor } from './status-chip';

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
    <Reveal as="section" className="relative z-20 grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)]">
      <RevealItem className="panel relative z-10 p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <ListFilter className="h-4 w-4 text-primary" />
          {copy.filters}
        </div>
        <form action="/results" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="runId" value={activeRunId ?? ''} />
          <input type="hidden" name="section" value={activeSection} />
          <label className="block">
            <span className="eyebrow mb-2 block">{copy.issueType}</span>
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
            <span className="eyebrow mb-2 block">{copy.page}</span>
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
            <span className="eyebrow mb-2 block">{copy.severity}</span>
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
            <span className="eyebrow mb-2 block">{copy.status}</span>
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
            <button className="btn-primary h-10 px-5">{copy.applyFilters}</button>
            <a className="btn-ghost h-10 px-4 text-muted-foreground" href={dashboardUrl('/results', { category: 'ALL', page: 'ALL', severity: 'ALL', status: 'ALL' }, searchParams)}>
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.reset}
            </a>
          </div>
        </form>
      </RevealItem>

      <RevealItem className="panel flex flex-col p-5 md:p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          {copy.selectedRun}
        </div>
        {selectedRun ? (
          <div className="panel-inset p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">{selectedRun.id.slice(0, 8)}</span>
              <span className="chip">{selectedRun.scanMode}</span>
            </div>
            <div className="mt-2 truncate font-mono text-sm" dir="ltr">{selectedRun.environment.targetUrl}</div>
            <div className="mt-2"><StatusChip value={selectedRun.status} /></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.noRunSelected}</p>
        )}

        <div className="mb-2 mt-5 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          {copy.runHistory}
        </div>
        <div className="-mx-1 max-h-44 space-y-1 overflow-auto px-1" data-lenis-prevent>
          {runs.map((run) => {
            const active = activeRunId === run.id;
            const tone = toneFor(run.status);
            return (
              <a
                key={run.id}
                href={dashboardUrl('/results', { runId: run.id }, searchParams)}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${active ? 'border-primary/50 bg-primary/[0.08]' : 'border-transparent hover:border-border hover:bg-secondary/50'}`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${tone})`, boxShadow: active ? `0 0 10px hsl(${tone})` : undefined }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs" dir="ltr">{run.environment.targetUrl}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">{run.id.slice(0, 8)} · {run.status}</span>
                </span>
              </a>
            );
          })}
        </div>
      </RevealItem>
    </Reveal>
  );
}

export function ResultsSidebar(props: ResultsControlsBarProps) {
  return <ResultsControlsBar {...props} />;
}
