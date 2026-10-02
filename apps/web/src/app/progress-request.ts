// Progress for an explicitly selected run stays on that run; otherwise the panel follows the
// newest run, so a scan started after the page loaded replaces the previous one.
export function progressRequestPath(pinnedRunId?: string): string {
  return pinnedRunId ? `/api/run-progress?runId=${encodeURIComponent(pinnedRunId)}` : '/api/run-progress';
}
