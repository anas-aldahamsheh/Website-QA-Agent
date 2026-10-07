'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, MinusCircle, Radio, RefreshCw } from 'lucide-react';
import type { LiveRunProgressDto, LiveCheckStatus } from '@/server/queries/run-progress';
import { progressRequestPath } from './progress-request';
import { easeOutExpo } from '@/components/motion/primitives';

type LiveRunProgressPanelProps = {
  initialProgress: LiveRunProgressDto;
  pinnedRunId?: string | undefined;
};

const CHECK_TONE: Record<LiveCheckStatus, string> = {
  WAITING: 'var(--muted-foreground)',
  RUNNING: 'var(--accent)',
  DONE: 'var(--ok)',
  ATTENTION: 'var(--sev-medium)',
  NOT_RUN: 'var(--muted-foreground)'
};

export function LiveRunProgressPanel({ initialProgress, pinnedRunId }: LiveRunProgressPanelProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [isPolling, setIsPolling] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);
  const [initialRunId, setInitialRunId] = useState(initialProgress.runId);

  // A server refresh after starting a scan brings a different run; show it right away.
  if (initialProgress.runId !== initialRunId) {
    setInitialRunId(initialProgress.runId);
    setProgress(initialProgress);
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(progressRequestPath(pinnedRunId), { cache: 'no-store' });
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
  }, [pinnedRunId]);

  useEffect(() => {
    setIsPolling(!['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT', 'NO_RUN'].includes(progress.status));
  }, [progress.status]);

  const estimatedRemaining = useMemo(() => formatDuration(progress.estimatedRemainingSeconds), [progress.estimatedRemainingSeconds]);
  const elapsed = useMemo(() => formatDuration(progress.elapsedSeconds) ?? '0s', [progress.elapsedSeconds]);
  const runningChecks = progress.checks.filter((check) => check.status === 'RUNNING').length;
  const doneChecks = progress.checks.filter((check) => check.status === 'DONE').length;
  const attentionChecks = progress.checks.filter((check) => check.status === 'ATTENTION').length;
  const notRunChecks = progress.checks.filter((check) => check.status === 'NOT_RUN').length;
  const runnableChecks = progress.checks.length - notRunChecks;
  const statusTone = statusColor(progress.status);

  return (
    <motion.section
      className="panel overflow-hidden"
      initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, ease: easeOutExpo }}
    >
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border" style={{ borderColor: `hsl(${statusTone} / 0.4)`, background: `hsl(${statusTone} / 0.08)` }}>
              {isPolling ? <span className="animate-pulse-ring absolute inset-0 rounded-lg border" style={{ borderColor: `hsl(${statusTone})` }} /> : null}
              <Radio className="h-4 w-4" style={{ color: `hsl(${statusTone})` }} />
            </span>
            Live Run Progress
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={progress.currentActivity}
              className="mt-2 text-xs text-muted-foreground"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.3 }}
            >
              {progress.currentActivity}
            </motion.p>
          </AnimatePresence>
          {progress.targetUrl && (
            <p className="mt-1 max-w-[720px] truncate font-mono text-[11px] text-primary" dir="ltr">{progress.targetUrl}</p>
          )}
        </div>
        <span className="chip self-start lg:self-center" style={{ color: `hsl(${statusTone})`, borderColor: `hsl(${statusTone} / 0.4)`, background: `hsl(${statusTone} / 0.08)` }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${statusTone})` }} />
          {progress.status}
        </span>
      </div>

      {(progress.workerState === 'WAITING_FOR_WORKER' || pollError) && (
        <div className="space-y-2 px-5 pt-5 md:px-7">
          {progress.workerState === 'WAITING_FOR_WORKER' && (
            <div className="flex items-start gap-2 rounded-lg border border-sev-medium/40 bg-sev-medium/10 p-3 text-xs text-sev-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Run is queued but no worker progress is visible yet. Keep `pnpm --filter worker dev` running in a separate terminal.</span>
            </div>
          )}
          {pollError && (
            <div className="flex items-start gap-2 rounded-lg border border-sev-critical/40 bg-sev-critical/10 p-3 text-xs text-sev-critical">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Live update failed: {pollError}. The panel will keep retrying.</span>
            </div>
          )}
        </div>
      )}

      <div className="grid items-center gap-6 px-5 py-6 md:px-7 xl:grid-cols-[400px_minmax(0,1fr)]">
        <CrawlOrbit
          percent={progress.progressPercent}
          scanned={progress.scannedPages}
          queued={progress.queuedUrls}
          failed={progress.failedPages}
          active={isPolling}
          tone={statusTone}
        />

        <div className="min-w-0 space-y-6">
          <div className="panel-inset relative overflow-hidden px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{isPolling ? 'Now scanning' : 'Last page'}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{progress.recentSteps[0]?.action ?? '—'}</span>
            </div>
            <div className="relative mt-2 h-8 overflow-hidden" dir="ltr">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={progress.recentSteps[0]?.id ?? 'none'}
                  className="truncate font-mono text-lg font-medium text-foreground md:text-xl"
                  initial={{ y: 28, opacity: 0, filter: 'blur(4px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ y: -28, opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.5, ease: easeOutExpo }}
                >
                  {progress.recentSteps[0]?.target ?? progress.targetUrl ?? '—'}
                </motion.div>
              </AnimatePresence>
            </div>
            {isPolling ? (
              <motion.span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Status" value={progress.status} tone="var(--primary)" />
            <Metric label="Elapsed" value={elapsed} />
            <Metric label="ETA" value={estimatedRemaining ?? 'calculating'} tone="var(--ok)" />
            <Metric label="Checks" value={`${doneChecks}/${runnableChecks}`} tone={attentionChecks > 0 ? 'var(--sev-medium)' : undefined} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>{progress.scannedPages} / {progress.pageLimit} pages scanned</span>
              <span className="text-foreground">{progress.progressPercent}%</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full border border-border bg-secondary">
              <motion.div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-accent via-primary to-primary"
                initial={{ width: '2%' }}
                animate={{ width: `${Math.max(2, Math.min(100, progress.progressPercent))}%` }}
                transition={{ duration: 1.1, ease: easeOutExpo }}
              >
                {isPolling ? <span className="progress-stripes absolute inset-0 opacity-50" /> : null}
                <span className="absolute inset-y-0 end-0 w-6 bg-white/60 blur-md" />
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Queued URLs" value={String(progress.queuedUrls)} />
            <Metric label="Failed Pages" value={String(progress.failedPages)} tone={progress.failedPages > 0 ? 'var(--sev-medium)' : undefined} />
            <Metric label="Blocked/Skipped" value={`${progress.blockedUrls}/${progress.skippedUrls}`} />
            <Metric label="Downloads/API" value={`${progress.downloads}/${progress.apiEndpoints}`} />
          </div>

        </div>
      </div>

  <div className="border-t border-border px-5 py-6 md:px-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow">Feature Checks</div>
          <div className="font-mono text-[10.5px] text-muted-foreground">
            Running {runningChecks} • Attention {attentionChecks}{notRunChecks > 0 ? ` • Not run ${notRunChecks}` : ''}
          </div>
        </div>
        <motion.div layout className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {progress.checks.map((check, index) => (
            <motion.div
              key={check.id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: check.status === 'NOT_RUN' ? 0.55 : 1, scale: 1 }}
              transition={{ duration: 0.5, ease: easeOutExpo, delay: Math.min(index * 0.025, 0.5) }}
              className={`group relative overflow-hidden rounded-lg border bg-background/60 px-3 py-2.5 ${check.status === 'NOT_RUN' ? 'border-dashed' : ''}`}
              style={{ borderColor: `hsl(${CHECK_TONE[check.status]} / ${check.status === 'WAITING' || check.status === 'NOT_RUN' ? 0.25 : 0.4})` }}
              title={check.detail}
            >
              <motion.span
                key={check.status}
                aria-hidden
                className="absolute inset-0"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
                style={{ background: `hsl(${CHECK_TONE[check.status]} / 0.25)` }}
              />
              {check.status === 'RUNNING' ? (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent/15 to-transparent"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : null}
              <div className="relative flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{check.label}</span>
                <span style={{ color: `hsl(${CHECK_TONE[check.status]})` }}>
                  {check.status === 'RUNNING' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {check.status === 'DONE' && <CheckCircle className="h-3.5 w-3.5" />}
                  {check.status === 'ATTENTION' && <AlertTriangle className="h-3.5 w-3.5" />}
                  {check.status === 'WAITING' && <Clock className="h-3.5 w-3.5" />}
                  {check.status === 'NOT_RUN' && <MinusCircle className="h-3.5 w-3.5" />}
                </span>
              </div>
              <div className="relative mt-0.5 flex items-center justify-between gap-2 font-mono text-[9.5px] text-muted-foreground">
                <span className="truncate">{check.section}</span>
                <span className="shrink-0 uppercase tracking-wider" style={{ color: `hsl(${CHECK_TONE[check.status]})` }}>{check.status.replace('_', ' ')}</span>
              </div>
              <div className="relative mt-1 truncate text-[10px] text-muted-foreground/80">{check.detail}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="grid gap-px border-t border-border bg-border xl:grid-cols-2">
        <div className="bg-card px-5 py-5 md:px-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-sev-critical/70" />
              <span className="h-2 w-2 rounded-full bg-sev-medium/70" />
              <span className="h-2 w-2 rounded-full bg-ok/70" />
            </span>
            <span className="eyebrow">Latest Events</span>
          </div>
          {progress.recentEvents.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No worker events yet.<span className="animate-caret">▌</span></p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/80 p-3 font-mono text-[11px]" data-lenis-prevent dir="ltr">
              <AnimatePresence initial={false}>
                {progress.recentEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, height: 0, x: -10 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: easeOutExpo }}
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-1"
                  >
                    <span className="text-muted-foreground/70">{formatEventTime(event.createdAt)}</span>
                    <span className="min-w-0 break-words text-muted-foreground">
                      <span className="me-2" style={{ color: `hsl(${eventTone(event.type)})` }}>{event.type}</span>
                      {event.message}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isPolling ? <div className="pt-1 text-primary">$ <span className="animate-caret">▌</span></div> : null}
            </div>
          )}
        </div>

        <div className="bg-card px-5 py-5 md:px-7">
          <div className="eyebrow mb-3">Live Navigation Steps</div>
          {progress.recentSteps.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No navigation steps recorded yet.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto pe-1" data-lenis-prevent dir="ltr">
              <AnimatePresence initial={false}>
                {progress.recentSteps.map((step) => (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: easeOutExpo }}
                    className="grid grid-cols-12 items-center gap-2 rounded-md border border-transparent px-2 py-1.5 font-mono text-[11px] transition-colors hover:border-border hover:bg-background/60"
                  >
                    <span className="col-span-2 text-muted-foreground/70">{formatEventTime(step.createdAt)}</span>
                    <span className="col-span-2 truncate text-muted-foreground">{step.action}</span>
                    <span className="col-span-6 truncate text-foreground" title={step.target ?? undefined}>{step.target ?? 'n/a'}</span>
                    <span className={`col-span-2 text-end ${step.status === 'PASSED' ? 'text-ok' : 'text-sev-critical'}`}>
                      {step.status}
                    </span>
                    {step.errorMessage && (
                      <span className="col-span-12 truncate text-sev-medium" title={step.errorMessage}>{step.errorMessage}</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3 font-mono text-[10.5px] text-muted-foreground md:px-7">
        <Activity className={isPolling ? 'h-3.5 w-3.5 animate-pulse text-primary' : 'h-3.5 w-3.5'} />
        <span>{isPolling ? 'Auto-updating every 2 seconds' : 'Auto-update paused because the run is finished or stopped'}</span>
      </div>
    </motion.section>
  );
}

// The crawl as a living constellation: every scanned page becomes a lit node branching from the
// start page, failed pages glow red, queued ones wait as hollow rings, and a beam sweeps the field
// while the scan runs. The ring around the core fills with the progress percentage.
function CrawlOrbit({ percent, scanned, queued, failed, active, tone }: { percent: number; scanned: number; queued: number; failed: number; active: boolean; tone: string }) {
  const total = Math.min(72, scanned + queued);
  const nodes = useMemo(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: total }, (_, index) => {
      const radius = 46 + Math.sqrt(index + 1) * 15.5;
      const angle = index * golden;
      return {
        x: Math.round((200 + Math.cos(angle) * Math.min(radius, 182)) * 100) / 100,
        y: Math.round((200 + Math.sin(angle) * Math.min(radius, 182)) * 100) / 100,
        parent: index < 4 ? -1 : Math.floor((index - 4) / 2.4)
      };
    });
  }, [total]);
  const ok = Math.max(0, scanned - failed);
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="panel-inset relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden" aria-hidden>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${tone})`} stopOpacity="0.35" />
            <stop offset="100%" stopColor={`hsl(${tone})`} stopOpacity="0" />
          </radialGradient>
        </defs>
        {[60, 105, 150, 190].map((radius, index) => (
          <circle key={radius} cx="200" cy="200" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray={index % 2 ? '2 6' : undefined} />
        ))}
        <circle cx="200" cy="200" r="70" fill="url(#orbit-core)" />

        {nodes.map((node, index) => {
          const parent = node.parent >= 0 ? nodes[node.parent] : undefined;
          const lit = index < scanned;
          return (
            <motion.line
              key={`edge-${index}`}
              x1={parent ? parent.x : 200}
              y1={parent ? parent.y : 200}
              x2={node.x}
              y2={node.y}
              stroke={lit ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              strokeWidth="0.8"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: lit ? 0.45 : 0.12 }}
              transition={{ duration: 0.9, ease: easeOutExpo, delay: Math.min(index * 0.03, 1.2) }}
            />
          );
        })}

        {nodes.map((node, index) => {
          const isFailed = index >= ok && index < scanned;
          const isScanned = index < ok;
          const color = isFailed ? 'hsl(var(--sev-critical))' : isScanned ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
          return (
            <motion.g key={`node-${index}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: Math.min(index * 0.03, 1.2) }} style={{ originX: `${node.x}px`, originY: `${node.y}px` }}>
              {isScanned || isFailed ? (
                <>
                  <circle cx={node.x} cy={node.y} r="6" fill={color} opacity="0.15" />
                  <circle cx={node.x} cy={node.y} r="2.6" fill={color} />
                </>
              ) : (
                <circle cx={node.x} cy={node.y} r="2.6" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="1" />
              )}
            </motion.g>
          );
        })}

        <circle cx="200" cy="200" r="34" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <motion.circle
          cx="200"
          cy="200"
          r="34"
          fill="none"
          stroke={`hsl(${tone})`}
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-90 200 200)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - Math.max(0, Math.min(100, percent)) / 100) }}
          transition={{ duration: 1.4, ease: easeOutExpo }}
          style={{ filter: `drop-shadow(0 0 6px hsl(${tone}))` }}
        />
      </svg>

      {active ? (
        <div className="absolute inset-[2.5%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,hsl(var(--primary)/0.04)_310deg,hsl(var(--primary)/0.30)_360deg)] [animation:sweep_3.2s_linear_infinite]" />
      ) : null}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums">{percent}%</span>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{ok}</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sev-critical" />{failed}</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />{queued}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="panel-inset relative overflow-hidden px-3 py-2.5">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="relative mt-1 h-5 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            className="truncate font-mono text-sm font-semibold"
            style={{ color: tone ? `hsl(${tone})` : undefined }}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.35, ease: easeOutExpo }}
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  if (['COMPLETED'].includes(status)) return 'var(--ok)';
  if (['PARTIALLY_COMPLETED', 'TIMED_OUT'].includes(status)) return 'var(--sev-medium)';
  if (['FAILED', 'CANCELED'].includes(status)) return 'var(--sev-critical)';
  if (status === 'NO_RUN') return 'var(--muted-foreground)';
  return 'var(--accent)';
}

function eventTone(type: string): string {
  if (type === 'ERROR') return 'var(--sev-critical)';
  if (type === 'WARNING') return 'var(--sev-medium)';
  if (type === 'STATE_CHANGE') return 'var(--accent)';
  return 'var(--primary)';
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
