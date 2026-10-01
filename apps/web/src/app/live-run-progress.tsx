'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, Radio, RefreshCw } from 'lucide-react';
import type { LiveRunProgressDto, LiveCheckStatus } from '@/server/queries/run-progress';

type LiveRunProgressPanelProps = {
  initialProgress: LiveRunProgressDto;
};

const CHECK_STATUS_CLASS: Record<LiveCheckStatus, string> = {
  WAITING: 'bg-secondary border-border text-muted-foreground',
  RUNNING: 'bg-primary/10 border-primary/40 text-primary',
  DONE: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500',
  ATTENTION: 'bg-amber-500/10 border-amber-500/40 text-amber-600'
};

export function LiveRunProgressPanel({ initialProgress }: LiveRunProgressPanelProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [isPolling, setIsPolling] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = progress.runId ? `?runId=${encodeURIComponent(progress.runId)}` : '';
        const response = await fetch(`/api/run-progress${params}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const nextProgress = await response.json() as LiveRunProgressDto;
        if (!cancelled) {
          setProgress(nextProgress);
          setPollError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPollError(error instanceof Error ? error.message : 'Unable to update progress');
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [progress.runId]);

  useEffect(() => {
    setIsPolling(!['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT', 'NO_RUN'].includes(progress.status));
  }, [progress.status]);

  const estimatedRemaining = useMemo(() => formatDuration(progress.estimatedRemainingSeconds), [progress.estimatedRemainingSeconds]);
  const elapsed = useMemo(() => formatDuration(progress.elapsedSeconds) ?? '0s', [progress.elapsedSeconds]);
  const runningChecks = progress.checks.filter((check) => check.status === 'RUNNING').length;
  const doneChecks = progress.checks.filter((check) => check.status === 'DONE').length;
  const attentionChecks = progress.checks.filter((check) => check.status === 'ATTENTION').length;

  return (
    <section className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio className={isPolling ? 'h-5 w-5 animate-pulse text-primary' : 'h-5 w-5 text-muted-foreground'} />
            Live Run Progress
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress.currentActivity}
          </p>
          {progress.targetUrl && (
            <p className="mt-1 max-w-[720px] truncate font-mono text-[11px] text-primary">{progress.targetUrl}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs min-w-full lg:min-w-[460px]">
          <Metric label="Status" value={progress.status} tone="blue" />
          <Metric label="Elapsed" value={elapsed} tone="neutral" />
          <Metric label="ETA" value={estimatedRemaining ?? 'calculating'} tone="emerald" />
          <Metric label="Checks" value={`${doneChecks}/${progress.checks.length || 0}`} tone={attentionChecks > 0 ? 'amber' : 'neutral'} />
        </div>
      </div>

      {progress.workerState === 'WAITING_FOR_WORKER' && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Run is queued but no worker progress is visible yet. Keep `pnpm --filter worker dev` running in a separate terminal.</span>
        </div>
      )}

      {pollError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Live update failed: {pollError}. The panel will keep retrying.</span>
        </div>
      )}

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.scannedPages} / {progress.pageLimit} pages scanned</span>
          <span>{progress.progressPercent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border border-border bg-secondary">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${Math.max(2, Math.min(100, progress.progressPercent))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <Metric label="Queued URLs" value={String(progress.queuedUrls)} tone="neutral" />
        <Metric label="Failed Pages" value={String(progress.failedPages)} tone={progress.failedPages > 0 ? 'amber' : 'neutral'} />
        <Metric label="Blocked/Skipped" value={`${progress.blockedUrls}/${progress.skippedUrls}`} tone="neutral" />
        <Metric label="Downloads/API" value={`${progress.downloads}/${progress.apiEndpoints}`} tone="neutral" />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feature Checks</div>
          <div className="text-[11px] text-muted-foreground">
            Running {runningChecks} • Attention {attentionChecks}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {progress.checks.map((check) => (
            <div key={check.id} className={`border rounded-lg p-3 ${CHECK_STATUS_CLASS[check.status]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs">{check.label}</span>
                {check.status === 'RUNNING' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {check.status === 'DONE' && <CheckCircle className="w-3.5 h-3.5" />}
                {check.status === 'ATTENTION' && <AlertTriangle className="w-3.5 h-3.5" />}
                {check.status === 'WAITING' && <Clock className="w-3.5 h-3.5" />}
              </div>
              <div className="text-[10px] opacity-80 mt-1">{check.section}</div>
              <div className="text-[10px] opacity-80 mt-1">{check.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest Events</div>
        {progress.recentEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No worker events yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {progress.recentEvents.map((event) => (
              <div key={event.id} className="rounded border border-border bg-background p-2 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-mono text-primary">{event.type}</span>
                  <span className="font-mono text-muted-foreground">{formatEventTime(event.createdAt)}</span>
                </div>
                <div className="font-mono break-words">{event.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Navigation Steps</div>
        {progress.recentSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground">No navigation steps recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {progress.recentSteps.map((step) => (
              <div key={step.id} className="grid grid-cols-12 gap-2 rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]">
                <span className="col-span-2 text-muted-foreground">{formatEventTime(step.createdAt)}</span>
                <span className="col-span-2 text-muted-foreground">{step.action}</span>
                <span className="col-span-6 truncate text-foreground" title={step.target ?? undefined}>{step.target ?? 'n/a'}</span>
                <span className={step.status === 'PASSED' ? 'col-span-2 text-right text-primary' : 'col-span-2 text-right text-destructive'}>
                  {step.status}
                </span>
                {step.errorMessage && (
                  <span className="col-span-12 truncate text-amber-600" title={step.errorMessage}>{step.errorMessage}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity className={isPolling ? 'h-3.5 w-3.5 animate-pulse text-primary' : 'h-3.5 w-3.5'} />
        <span>{isPolling ? 'Auto-updating every 2 seconds' : 'Auto-update paused because the run is finished or stopped'}</span>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'blue' | 'emerald' | 'amber' }) {
  const valueClass = tone === 'blue'
    ? 'text-primary'
    : tone === 'emerald'
      ? 'text-emerald-500'
      : tone === 'amber'
        ? 'text-amber-600'
        : 'text-foreground';

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold font-mono mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatEventTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }
  return [
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  ].map((part) => part.toString().padStart(2, '0')).join(':');
}
