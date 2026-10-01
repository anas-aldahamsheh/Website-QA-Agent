import { Trash2 } from 'lucide-react';
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

  return (
    <DashboardShell
      activePage="home"
      title={copy.runCenterTitle}
      subtitle={copy.runCenterSubtitle}
      copy={copy}
      locale={locale}
      actions={
        <form action={clearAllDataAction}>
          <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground">
            <Trash2 className="h-4 w-4" />
            {copy.clearData}
          </button>
        </form>
      }
    >
      <SummaryCards
        copy={copy}
        totalRuns={data.totalRuns}
        activeRuns={data.activeRuns}
        failedRuns={data.failedRuns}
        openIssues={data.openIssues}
      />

      <ScanLauncherPanel copy={copy} profile={selectedProfile ? readProfileConfig(selectedProfile.config) : undefined} />

      <LiveRunProgressPanel initialProgress={data.liveRunProgress} />

      <RecentWorkPanel runs={data.runs} profiles={data.profiles} searchParams={query} copy={copy} />
    </DashboardShell>
  );
}
