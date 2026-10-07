import { Info, Radio, Trash2 } from 'lucide-react';
import { clearAllDataAction } from './actions';
import { LiveRunProgressPanel } from './live-run-progress';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getDashboardCopy, type DashboardLocale } from '@/components/dashboard/dashboard-copy';
import { RecentWorkPanel } from '@/components/dashboard/recent-work-panel';
import { ScanLauncherPanel } from '@/components/dashboard/scan-launcher-panel';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { getDashboardData, readProfileConfig, type DashboardSearchParams } from '@/server/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<DashboardSearchParams> | undefined }) {
  const query = await searchParams ?? {};
  const data = await getDashboardData(query);
  const locale: DashboardLocale = query.locale === 'ar' ? 'ar' : 'en';
  const copy = getDashboardCopy(locale);
  const selectedProfile = data.profiles.find((profile) => profile.id === query.profileId);
  const publicDemo = process.env['APP_PUBLIC_MODE'] === 'true';

  return (
    <DashboardShell
      activePage="home"
      title={copy.runCenterTitle}
      subtitle={copy.runCenterSubtitle}
      copy={copy}
      locale={locale}
      actions={
        publicDemo ? undefined : (
          <form action={clearAllDataAction}>
            <button className="btn-danger h-10">
              <Trash2 className="h-4 w-4" />
              {copy.clearData}
            </button>
          </form>
        )
      }
    >
      {publicDemo && query.notice === 'scan-busy' && (
        <p role="status" className="panel flex items-center gap-3 border-sev-medium/50 px-5 py-4 text-sm font-semibold text-foreground">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sev-medium/50 bg-sev-medium/10 text-sev-medium">
            <span className="animate-pulse-ring absolute inset-0 rounded-lg border border-sev-medium" />
            <Radio className="h-4 w-4" />
          </span>
          {copy.publicDemoBusy}
        </p>
      )}

      {publicDemo && (
        <p className="flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] px-5 py-3.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {copy.publicDemoNote}
        </p>
      )}

      <SummaryCards
        copy={copy}
        totalRuns={data.totalRuns}
        activeRuns={data.activeRuns}
        failedRuns={data.failedRuns}
        openIssues={data.openIssues}
      />

      <ScanLauncherPanel copy={copy} profile={selectedProfile ? readProfileConfig(selectedProfile.config) : undefined} publicDemo={publicDemo} />

      <LiveRunProgressPanel initialProgress={data.liveRunProgress} pinnedRunId={query.runId} />

      <RecentWorkPanel runs={data.runs} profiles={data.profiles} searchParams={query} copy={copy} publicDemo={publicDemo} />
    </DashboardShell>
  );
}
