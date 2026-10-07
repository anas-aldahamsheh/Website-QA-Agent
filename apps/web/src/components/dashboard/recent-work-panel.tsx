import { ArrowUpRight, Copy, RotateCcw } from 'lucide-react';
import { duplicateTestProfileAction, resumeRunAction } from '@/app/actions';
import { RunStopButton } from '@/components/dashboard/run-stop-button';
import Link from 'next/link';
import { dashboardUrl, readProfileConfig, readScopeConfigPreview, type DashboardProfile, type DashboardRun, type DashboardSearchParams } from '@/server/queries/dashboard';
import { Reveal, RevealItem } from '@/components/motion/primitives';
import type { DashboardCopy } from './dashboard-copy';
import { StatusChip, toneFor } from './status-chip';

type RecentWorkPanelProps = {
  runs: DashboardRun[];
  profiles: DashboardProfile[];
  searchParams: DashboardSearchParams;
  copy: DashboardCopy;
  publicDemo?: boolean;
};

export function RecentWorkPanel({ runs, profiles, searchParams, copy, publicDemo = false }: RecentWorkPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <Reveal className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
          <div>
            <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
              {copy.recentRuns}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.recentRunsBody}</p>
          </div>
          <Link className="btn-ghost shrink-0" href="/results">
            {copy.navResults}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {runs.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">{copy.noRuns}</p>
          ) : (
            runs.slice(0, 5).map((run) => {
              const scope = readScopeConfigPreview(run.scopeConfig);
              const resumeSelectedRunAction = resumeRunAction.bind(null, run.id);
              const tone = toneFor(run.status);
              return (
                <RevealItem key={run.id}>
                  <div className="group relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center md:px-6">
                    <span aria-hidden className="absolute inset-y-3 start-0 w-[2px] origin-center scale-y-0 rounded-full transition-transform duration-500 ease-out-expo group-hover:scale-y-100" style={{ background: `hsl(${tone})` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip value={run.status} />
                        <span className="font-mono text-[11px] text-muted-foreground">{run.id.slice(0, 8)}</span>
                      </div>
                      <div className="mt-2 truncate font-mono text-sm text-foreground" dir="ltr">{run.environment.targetUrl}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                        <span>{run.scanMode}</span>
                        {scope.maxPages ? <span>{scope.maxPages} {copy.pagesUnit}</span> : null}
                        {scope.concurrency ? <span>{scope.concurrency} concurrency</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {['FAILED', 'CANCELED', 'TIMED_OUT'].includes(run.status) ? (
                        <form action={resumeSelectedRunAction}>
                          <button className="btn-ghost h-7 px-2.5 text-xs">
                            <RotateCcw className="h-3 w-3" />
                            {copy.retry}
                          </button>
                        </form>
                      ) : null}
                      <RunStopButton runId={run.id} status={run.status} size="sm" />
                      <Link className="btn-ghost h-7 px-2.5 text-xs" href={dashboardUrl('/results', { runId: run.id }, searchParams)}>
                        {copy.viewDetails}
                        <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </RevealItem>
              );
            })
          )}
        </div>
      </Reveal>

      <Reveal className="panel overflow-hidden" delay={0.08}>
        <div className="border-b border-border px-5 py-4 md:px-6">
          <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            {copy.savedProfiles}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.savedProfilesBody}</p>
        </div>
        <div className="space-y-2 p-4 md:p-5">
          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{copy.noProfiles}</p>
          ) : (
            profiles.map((profile) => {
              const config = readProfileConfig(profile.config);
              const duplicateSelectedProfileAction = duplicateTestProfileAction.bind(null, profile.id);
              return (
                <RevealItem key={profile.id}>
                  <div className="panel-inset group p-4 transition-colors hover:border-primary/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{profile.name}</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
                          {config.targetUrl ?? 'No target stored'} · {config.scanMode ?? 'STANDARD'}
                        </div>
                      </div>
                      {publicDemo ? null : (
                        <form action={duplicateSelectedProfileAction}>
                          <button className="btn-ghost h-7 px-2.5 text-xs">
                            <Copy className="h-3 w-3" />
                            {copy.duplicate}
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(config.checks ?? []).slice(0, 6).map((check) => (
                        <span key={check} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{check}</span>
                      ))}
                      {(config.checks ?? []).length === 0 ? <span className="text-xs text-muted-foreground">No checks stored</span> : null}
                    </div>
                    <Link className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary" href={dashboardUrl('/Run%20Center', { profileId: profile.id }, searchParams)}>
                      {copy.useProfile}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </RevealItem>
              );
            })
          )}
        </div>
      </Reveal>
    </section>
  );
}
