import { prisma } from '@sentinelqa/database';

export type LiveCheckStatus = 'WAITING' | 'RUNNING' | 'DONE' | 'ATTENTION';

export type LiveRunProgressDto = {
  runId: string | null;
  targetUrl: string | null;
  status: string;
  scanMode: string | null;
  workerState: 'WAITING_FOR_WORKER' | 'RUNNING' | 'FINISHED' | 'FAILED_OR_STOPPED' | 'NO_RUN';
  progressPercent: number;
  scannedPages: number;
  pageLimit: number;
  queuedUrls: number;
  failedPages: number;
  blockedUrls: number;
  skippedUrls: number;
  downloads: number;
  assets: number;
  apiEndpoints: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number | null;
  currentActivity: string;
  lastUpdatedAt: string | null;
  checks: {
    id: string;
    label: string;
    section: string;
    status: LiveCheckStatus;
    detail: string;
  }[];
  recentEvents: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }[];
  recentSteps: {
    id: string;
    action: string;
    target: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }[];
};

type CoverageCounters = {
  scanned: number;
  queued: number;
  failed: number;
  blocked: number;
  skipped: number;
  downloads: number;
  assets: number;
  apiEndpoints: number;
  pageLimit: number;
};

const CHECK_CATALOG: { id: string; label: string; section: string; eventHints: string[] }[] = [
  { id: 'discovery', label: 'Discovery', section: 'Crawl Coverage', eventHints: ['CRAWL', 'Coverage counters'] },
  { id: 'recursive_links', label: 'Recursive Links', section: 'Crawl Coverage', eventHints: ['QUEUED', 'VISITED'] },
  { id: 'visual_layout', label: 'Visual Layout', section: 'UI Visual', eventHints: ['VISUAL', 'Screenshot evidence'] },
  { id: 'font_sizing', label: 'Font Sizing', section: 'Accessibility', eventHints: ['A11Y_TEXT_SIZE'] },
  { id: 'navigation_flows', label: 'Navigation Flows', section: 'Functional', eventHints: ['navigate', 'VISITED'] },
  { id: 'interaction_loops', label: 'Interaction Loops', section: 'Functional', eventHints: ['Deterministic page audit'] },
  { id: 'mobile_viewport', label: 'Mobile Viewport', section: 'Responsive', eventHints: ['RESPONSIVE', 'viewport'] },
  { id: 'tablet_viewport', label: 'Tablet Viewport', section: 'Responsive', eventHints: ['RESPONSIVE', 'viewport'] },
  { id: 'accessibility', label: 'Accessibility', section: 'Accessibility', eventHints: ['A11Y', 'ACCESSIBILITY'] },
  { id: 'screen_reader', label: 'Screen Reader', section: 'Accessibility', eventHints: ['heading', 'alt'] },
  { id: 'performance', label: 'Performance', section: 'Performance', eventHints: ['Performance', 'Page.NavigationDurationMs'] },
  { id: 'resource_sizes', label: 'Resource Sizes', section: 'Performance', eventHints: ['TransferSize', 'RESOURCE'] },
  { id: 'seo', label: 'SEO', section: 'SEO', eventHints: ['SEO'] },
  { id: 'structured_data', label: 'Structured Data', section: 'SEO', eventHints: ['JSON_LD', 'STRUCTURED_DATA'] },
  { id: 'security', label: 'Security', section: 'Security', eventHints: ['WEBSEC', 'SECURITY'] },
  { id: 'ssrf_protection', label: 'SSRF Protection', section: 'Security', eventHints: ['SSRF'] },
  { id: 'cookies_inspection', label: 'Cookies Inspection', section: 'Tracking Privacy', eventHints: ['cookie', 'PRIVACY'] },
  { id: 'consent_banners', label: 'Consent Banners', section: 'Tracking Privacy', eventHints: ['CONSENT'] },
  { id: 'broken_links', label: 'Broken Links', section: 'Network API', eventHints: ['HTTP_4XX', 'FAILED'] },
  { id: 'spell_check', label: 'Spell Check', section: 'Content', eventHints: ['CONTENT'] },
  { id: 'api_payload', label: 'API Payload', section: 'Network API', eventHints: ['API', 'NETWORK'] },
  { id: 'schema_match', label: 'Schema Match', section: 'Network API', eventHints: ['schema', 'JSON'] },
  { id: 'full_page_trace', label: 'Full Page Trace', section: 'Evidence', eventHints: ['EVIDENCE', 'trace'] },
  { id: 'video_recording', label: 'Video Recording', section: 'Evidence', eventHints: ['video', 'EVIDENCE'] }
];

export async function getLiveRunProgress(runId?: string): Promise<LiveRunProgressDto> {
  const run = await prisma.testRun.findFirst({
    ...(runId ? { where: { id: runId } } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      scanMode: true,
      scopeConfig: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      environment: {
        select: {
          targetUrl: true
        }
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true
        }
      },
      metrics: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          name: true,
          createdAt: true
        }
      },
      caseRuns: {
        select: {
          stepRuns: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              action: true,
              target: true,
              status: true,
              errorMessage: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  if (!run) {
    return emptyProgress();
  }

  const coverage = readCoverageCounters(run.events.map((event) => event.metadata), run.scopeConfig);
  const selectedChecks = readSelectedChecks(run.events.map((event) => event.metadata));
  const eventText = [
    ...run.events.map((event) => event.message),
    ...run.metrics.map((metric) => metric.name)
  ].join('\n');
  const startedAt = run.startedAt ?? run.createdAt;
  const elapsedSeconds = Math.max(0, Math.floor(((run.completedAt?.getTime() ?? Date.now()) - startedAt.getTime()) / 1000));
  const progressPercent = calculateProgressPercent(run.status, coverage);
  const estimatedRemainingSeconds = estimateRemainingSeconds(run.status, elapsedSeconds, coverage, progressPercent);
  const workerState = inferWorkerState(run.status, run.startedAt, run.events.length);
  const currentActivity = inferCurrentActivity(run.status, workerState, run.events[0]?.message);

  return {
    runId: run.id,
    targetUrl: run.environment.targetUrl,
    status: run.status,
    scanMode: run.scanMode,
    workerState,
    progressPercent,
    scannedPages: coverage.scanned,
    pageLimit: coverage.pageLimit,
    queuedUrls: coverage.queued,
    failedPages: coverage.failed,
    blockedUrls: coverage.blocked,
    skippedUrls: coverage.skipped,
    downloads: coverage.downloads,
    assets: coverage.assets,
    apiEndpoints: coverage.apiEndpoints,
    elapsedSeconds,
    estimatedRemainingSeconds,
    currentActivity,
    lastUpdatedAt: run.updatedAt.toISOString(),
    checks: selectedChecks.map((checkId) => buildCheckProgress(checkId, run.status, eventText)),
    recentEvents: run.events.slice(0, 10).map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt.toISOString()
    })),
    recentSteps: run.caseRuns
      .flatMap((caseRun) => caseRun.stepRuns)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 20)
      .map((step) => ({
        id: step.id,
        action: step.action,
        target: step.target,
        status: step.status,
        errorMessage: step.errorMessage,
        createdAt: step.createdAt.toISOString()
      }))
  };
}

function emptyProgress(): LiveRunProgressDto {
  return {
    runId: null,
    targetUrl: null,
    status: 'NO_RUN',
    scanMode: null,
    workerState: 'NO_RUN',
    progressPercent: 0,
    scannedPages: 0,
    pageLimit: 0,
    queuedUrls: 0,
    failedPages: 0,
    blockedUrls: 0,
    skippedUrls: 0,
    downloads: 0,
    assets: 0,
    apiEndpoints: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: null,
    currentActivity: 'No test run has been started yet.',
    lastUpdatedAt: null,
    checks: [],
    recentEvents: [],
    recentSteps: []
  };
}

function readCoverageCounters(metadataList: unknown[], scopeConfig: unknown): CoverageCounters {
  const fromEvent = metadataList.map(readCoverageFromMetadata).find((metadata) => metadata !== null);
  const pageLimit = readNumberField(scopeConfig, 'maxPages') ?? 100;
  return fromEvent ?? {
    scanned: 0,
    queued: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    downloads: 0,
    assets: 0,
    apiEndpoints: 0,
    pageLimit
  };
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function readCoverageFromMetadata(metadata: unknown): CoverageCounters | null {
  const record = parseJsonRecord(metadata);
  if (!record || typeof record['scanned'] !== 'number') return null;
  return {
    scanned: record['scanned'],
    queued: readNumber(record['queued']),
    failed: readNumber(record['failed']),
    blocked: readNumber(record['blocked']),
    skipped: readNumber(record['skipped']),
    downloads: readNumber(record['downloads']),
    assets: readNumber(record['assets']),
    apiEndpoints: readNumber(record['apiEndpoints']),
    pageLimit: readNumber(record['pageLimit']) || 100
  };
}

function readSelectedChecks(metadataList: unknown[]): string[] {
  const metadata = metadataList.map(parseJsonRecord).find((item) => {
    if (!item) return false;
    return Array.isArray(item['checks']);
  });
  if (!metadata) {
    return CHECK_CATALOG.map((check) => check.id);
  }
  const checks = metadata['checks'];
  if (!Array.isArray(checks)) {
    return CHECK_CATALOG.map((check) => check.id);
  }
  return checks.filter((check): check is string => typeof check === 'string');
}

function buildCheckProgress(checkId: string, runStatus: string, eventText: string): LiveRunProgressDto['checks'][number] {
  const catalogItem = CHECK_CATALOG.find((check) => check.id === checkId);
  const matched = catalogItem?.eventHints.some((hint) => eventText.toLowerCase().includes(hint.toLowerCase())) ?? false;
  const finished = ['COMPLETED', 'PARTIALLY_COMPLETED'].includes(runStatus);
  const failed = ['FAILED', 'CANCELED', 'TIMED_OUT'].includes(runStatus);
  const status: LiveCheckStatus = failed ? 'ATTENTION' : finished || matched ? 'DONE' : runStatus === 'QUEUED' ? 'WAITING' : 'RUNNING';
  return {
    id: checkId,
    label: catalogItem?.label ?? checkId,
    section: catalogItem?.section ?? 'Other',
    status,
    detail: status === 'WAITING'
      ? 'Waiting for worker pickup'
      : status === 'RUNNING'
        ? 'In progress or waiting for related evidence'
        : status === 'ATTENTION'
          ? 'Needs review because the run stopped or failed'
          : 'Evidence observed or run finished'
  };
}

function calculateProgressPercent(status: string, coverage: CoverageCounters): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'PARTIALLY_COMPLETED') return Math.max(5, Math.min(100, Math.round((coverage.scanned / Math.max(1, coverage.pageLimit)) * 100)));
  if (['FAILED', 'CANCELED', 'TIMED_OUT'].includes(status)) return Math.max(0, Math.min(100, Math.round((coverage.scanned / Math.max(1, coverage.pageLimit)) * 100)));
  if (status === 'QUEUED') return 2;
  return Math.max(5, Math.min(95, Math.round((coverage.scanned / Math.max(1, coverage.pageLimit)) * 100)));
}

function estimateRemainingSeconds(status: string, elapsedSeconds: number, coverage: CoverageCounters, progressPercent: number): number | null {
  if (['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT', 'PARTIALLY_COMPLETED'].includes(status)) return 0;
  if (progressPercent <= 5 || coverage.scanned === 0) return null;
  const totalEstimatedSeconds = Math.round(elapsedSeconds / (progressPercent / 100));
  return Math.max(0, totalEstimatedSeconds - elapsedSeconds);
}

function inferWorkerState(status: string, startedAt: Date | null, eventCount: number): LiveRunProgressDto['workerState'] {
  if (status === 'QUEUED' && !startedAt && eventCount <= 1) return 'WAITING_FOR_WORKER';
  if (['COMPLETED', 'PARTIALLY_COMPLETED'].includes(status)) return 'FINISHED';
  if (['FAILED', 'CANCELED', 'TIMED_OUT'].includes(status)) return 'FAILED_OR_STOPPED';
  if (status === 'QUEUED') return 'WAITING_FOR_WORKER';
  return 'RUNNING';
}

function inferCurrentActivity(status: string, workerState: LiveRunProgressDto['workerState'], latestMessage?: string): string {
  if (workerState === 'WAITING_FOR_WORKER') return 'Run is queued. Start the worker terminal if this does not change.';
  if (workerState === 'FINISHED') return 'Run finished. Results are available below.';
  if (workerState === 'FAILED_OR_STOPPED') return 'Run stopped or failed. Review the latest event and issues.';
  return latestMessage ?? `Run is ${status.toLowerCase()}.`;
}

function readNumberField(value: unknown, field: string): number | null {
  const record = parseJsonRecord(value);
  if (!record) return null;
  const candidate = record[field];
  return typeof candidate === 'number' ? candidate : null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}
