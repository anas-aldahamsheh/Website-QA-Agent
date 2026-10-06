// Statuses of a run that has not finished yet.
export const ACTIVE_RUN_STATUSES = ['QUEUED', 'PROVISIONING', 'RUNNING', 'EXECUTING', 'DISCOVERING', 'PLANNING', 'ANALYZING'];

// A scan stops itself once its time limit passes. A run still marked active well after that was cut off
// (the app was stopped mid-scan), so it no longer counts as running.
const GRACE_MINUTES = 10;
const DEFAULT_TIME_LIMIT_MINUTES = 30;

export function isLiveRun(run: { createdAt: Date; scopeConfig: string | null }, now: Date): boolean {
  let limit = DEFAULT_TIME_LIMIT_MINUTES;
  try {
    const stored = JSON.parse(run.scopeConfig ?? '{}') as { maxExecutionTime?: unknown };
    if (typeof stored.maxExecutionTime === 'number' && stored.maxExecutionTime > 0) {
      limit = stored.maxExecutionTime;
    }
  } catch {
    // An unreadable configuration keeps the default limit.
  }
  return now.getTime() - run.createdAt.getTime() < (limit + GRACE_MINUTES) * 60_000;
}
