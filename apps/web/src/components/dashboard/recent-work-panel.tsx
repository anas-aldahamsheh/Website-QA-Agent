import { Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { duplicateTestProfileAction, resumeRunAction } from '@/app/actions';
import { RunStopButton } from '@/components/dashboard/run-stop-button';
import Link from 'next/link';
import { dashboardUrl, readProfileConfig, readScopeConfigPreview, type DashboardProfile, type DashboardRun, type DashboardSearchParams } from '@/server/queries/dashboard';
import type { DashboardCopy } from './dashboard-copy';

type RecentWorkPanelProps = {
  runs: DashboardRun[];
  profiles: DashboardProfile[];
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
  publicDemo?: boolean;
};

export function RecentWorkPanel({ runs, profiles, searchParams, copy, publicDemo = false }: RecentWorkPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{copy.recentRuns}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.recentRunsBody}</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm" href="/results">
            {copy.navResults}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noRuns}</p>
          ) : (
            runs.slice(0, 5).map((run) => {
              const scope = readScopeConfigPreview(run.scopeConfig);
              const resumeSelectedRunAction = resumeRunAction.bind(null, run.id);
              return (
                <div key={run.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{run.id.slice(0, 8)}</div>
                      <div className="mt-1 text-sm font-semibold">{run.environment.targetUrl}</div>
                    </div>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{run.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{run.scanMode}</span>
                    {scope.maxPages ? <span>{scope.maxPages} pages</span> : null}
                    {scope.concurrency ? <span>{scope.concurrency} concurrency</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="rounded-md border border-border px-3 py-1.5 text-xs" href={dashboardUrl('/results', { runId: run.id }, searchParams)}>
                      {copy.viewDetails}
                    </Link>
                    {['FAILED', 'CANCELED', 'TIMED_OUT'].includes(run.status) ? (
                      <form action={resumeSelectedRunAction}>
                        <button className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </button>
                      </form>
                    ) : null}
                    <RunStopButton runId={run.id} status={run.status} size="sm" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{copy.savedProfiles}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.savedProfilesBody}</p>
        <div className="mt-4 space-y-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noProfiles}</p>
          ) : (
            profiles.map((profile) => {
              const config = readProfileConfig(profile.config);
              const duplicateSelectedProfileAction = duplicateTestProfileAction.bind(null, profile.id);
              return (
                <div key={profile.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{profile.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {config.targetUrl ?? 'No target stored'} · {config.scanMode ?? 'STANDARD'}
                      </div>
                    </div>
                    {publicDemo ? null : (
                      <form action={duplicateSelectedProfileAction}>
                        <button className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs">
                          <Copy className="h-3 w-3" />
                          {copy.duplicate}
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {(config.checks ?? []).slice(0, 6).join(', ') || 'No checks stored'}
                  </div>
                  <Link className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-xs" href={dashboardUrl('/Run%20Center', { profileId: profile.id }, searchParams)}>
                    Use profile
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
