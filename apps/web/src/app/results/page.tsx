import { LiveRunProgressPanel } from '../live-run-progress';
import { DashboardShell, EmptyState } from '@/components/dashboard/dashboard-shell';
import { getDashboardCopy, type DashboardLocale } from '@/components/dashboard/dashboard-copy';
import { IssuesPanel, MetricsPanel, ResultsOverviewPanel, ResultsWorkspaceHeader, RunLogsPanel } from '@/components/dashboard/results-panels';
import { ResultsSidebar } from '@/components/dashboard/results-sidebar';
import { getDashboardData, type DashboardSearchParams } from '@/server/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({ searchParams }: { searchParams?: Promise<DashboardSearchParams> }) {
  const query = await searchParams ?? {};
  const data = await getDashboardData(query);
  const activeSection = query.section ?? 'overview';
  const locale: DashboardLocale = query.locale === 'ar' ? 'ar' : 'en';
  const copy = getDashboardCopy(locale);

  return (
    <DashboardShell
      activePage="results"
      title={copy.resultsTitle}
      subtitle={copy.resultsSubtitle}
      copy={copy}
      locale={locale}
    >
      {data.runs.length === 0 ? (
        <EmptyState title={copy.noResultsTitle} body={copy.noResultsBody} />
      ) : (
        <div className="space-y-6">
          <ResultsWorkspaceHeader
            selectedRun={data.selectedRun}
            activeSection={activeSection}
            totalRuns={data.totalRuns}
            activeRuns={data.activeRuns}
            failedRuns={data.failedRuns}
            openIssues={data.openIssues}
            searchParams={query}
            copy={copy}
          />

          <div className="space-y-6">
            <ResultsSidebar
            runs={data.runs}
            categories={data.categoryOrder}
            pages={data.targetPages}
            searchParams={query}
            copy={copy}
          />

            <div className="min-w-0 space-y-6">
              {activeSection === 'overview' ? (
                <ResultsOverviewPanel
                  runs={data.runs}
                  issues={data.issues}
                  issueCountByCategory={data.issueCountByCategory}
                  issueCountBySeverity={data.issueCountBySeverity}
                  statusCounts={data.statusCounts}
                  categories={data.categoryOrder}
                  searchParams={query}
                  copy={copy}
                />
              ) : null}

              {activeSection === 'live' ? <LiveRunProgressPanel initialProgress={data.liveRunProgress} /> : null}
              {activeSection === 'logs' ? <RunLogsPanel runs={data.selectedRun ? [data.selectedRun] : data.runs} events={data.runEvents} copy={copy} /> : null}
              {activeSection === 'issues' ? <IssuesPanel issues={data.issues} searchParams={query} copy={copy} /> : null}
              {activeSection === 'metrics' ? <MetricsPanel metrics={data.metrics} auditLogs={data.auditLogs} copy={copy} /> : null}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
