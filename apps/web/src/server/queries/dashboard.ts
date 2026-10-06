import { prisma } from '@sentinelqa/database';
import { getLiveRunProgress } from './run-progress';

export type DashboardSearchParams = {
  profileId?: string;
  severity?: string;
  category?: string;
  status?: string;
  q?: string;
  page?: string;
  browser?: string;
  viewport?: string;
  kind?: string;
  tab?: string;
  locale?: string;
  dir?: string;
  runId?: string;
  section?: string;
  notice?: string;
};

export type DashboardProfile = {
  id: string;
  name: string;
  createdAt: Date;
  config: unknown;
};

export type DashboardStepRun = {
  id: string;
  action: string;
  status: string;
  target: string | null;
  durationMs: number;
  errorMessage: string | null;
  createdAt: Date;
};

export type DashboardCaseRun = {
  id: string;
  name: string;
  status: string;
  durationMs: number;
  stepRuns: DashboardStepRun[];
};

export type DashboardRun = {
  id: string;
  status: string;
  scanMode: string;
  scopeConfig: unknown;
  createdAt: Date;
  updatedAt: Date;
  environment: {
    id: string;
    name: string;
    targetUrl: string;
    projectId: string;
    createdAt: Date;
  };
  caseRuns: DashboardCaseRun[];
};

export type DashboardIssue = {
  id: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  suggestedFix: string | null;
  createdAt: Date;
  updatedAt: Date;
  occurrences: {
    id: string;
    issueId: string;
    testRunId: string;
    browser: string;
    device: string;
    evidencePath: string | null;
    createdAt: Date;
  }[];
};

export type DashboardRunEvent = {
  id: string;
  testRunId: string;
  type: string;
  message: string;
  metadata: unknown;
  createdAt: Date;
};

export type DashboardMetric = {
  id: string;
  testRunId: string;
  name: string;
  value: number;
  createdAt: Date;
};

export type DashboardAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  userId: string | null;
  createdAt: Date;
};

export type SavedProfileConfig = {
  targetUrl?: string;
  scanMode?: string;
  checks?: string[];
  scopeConfig?: Record<string, unknown>;
};

export type ScopeConfigPreview = {
  maxPages?: number;
  concurrency?: number;
  perHostConcurrency?: number;
  requestsPerSecond?: number;
  requestsPerSecondPerHost?: number;
  navigationDelayMinMs?: number;
  navigationDelayMaxMs?: number;
  htmlPageConcurrency?: number;
  apiConcurrency?: number;
  assetConcurrency?: number;
  externalLinkConcurrency?: number;
  identifyScanner?: boolean;
  scannerUserAgentProduct?: string;
};

export const resultCategoryOrder = [
  'ACCESSIBILITY',
  'API',
  'CONSENT',
  'CONTENT',
  'CRAWL',
  'DOWNLOADS',
  'EVIDENCE',
  'FRONTEND',
  'FUNCTIONAL',
  'LOCALIZATION',
  'NETWORK_API',
  'PERFORMANCE',
  'PRIVACY',
  'PWA',
  'RESPONSIVE',
  'RUNTIME',
  'SCAN_ENVIRONMENT',
  'SECURITY',
  'SEO',
  'TRACKING_PRIVACY',
  'UX',
  'VISUAL',
  'ACCESS_VIOLATION',
  'PERFORMANCE_DROP',
  'CONSOLE_ERROR',
  'SECURITY_ALERT'
];

export function readProfileConfig(value: unknown): SavedProfileConfig {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const config: SavedProfileConfig = {};
  if (typeof record['targetUrl'] === 'string') config.targetUrl = record['targetUrl'];
  if (typeof record['scanMode'] === 'string') config.scanMode = record['scanMode'];
  if (Array.isArray(record['checks'])) {
    config.checks = record['checks'].filter((item): item is string => typeof item === 'string');
  }
  if (record['scopeConfig'] && typeof record['scopeConfig'] === 'object' && !Array.isArray(record['scopeConfig'])) {
    config.scopeConfig = record['scopeConfig'] as Record<string, unknown>;
  }
  return config;
}

export function readScopeConfigPreview(value: unknown): ScopeConfigPreview {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const config: ScopeConfigPreview = {};
  if (typeof record['maxPages'] === 'number') config.maxPages = record['maxPages'];
  if (typeof record['concurrency'] === 'number') config.concurrency = record['concurrency'];
  if (typeof record['perHostConcurrency'] === 'number') config.perHostConcurrency = record['perHostConcurrency'];
  if (typeof record['requestsPerSecond'] === 'number') config.requestsPerSecond = record['requestsPerSecond'];
  if (typeof record['requestsPerSecondPerHost'] === 'number') config.requestsPerSecondPerHost = record['requestsPerSecondPerHost'];
  if (typeof record['navigationDelayMinMs'] === 'number') config.navigationDelayMinMs = record['navigationDelayMinMs'];
  if (typeof record['navigationDelayMaxMs'] === 'number') config.navigationDelayMaxMs = record['navigationDelayMaxMs'];
  if (typeof record['htmlPageConcurrency'] === 'number') config.htmlPageConcurrency = record['htmlPageConcurrency'];
  if (typeof record['apiConcurrency'] === 'number') config.apiConcurrency = record['apiConcurrency'];
  if (typeof record['assetConcurrency'] === 'number') config.assetConcurrency = record['assetConcurrency'];
  if (typeof record['externalLinkConcurrency'] === 'number') config.externalLinkConcurrency = record['externalLinkConcurrency'];
  if (typeof record['identifyScanner'] === 'boolean') config.identifyScanner = record['identifyScanner'];
  if (typeof record['scannerUserAgentProduct'] === 'string') config.scannerUserAgentProduct = record['scannerUserAgentProduct'];
  return config;
}

export function dashboardUrl(pathname: string, next: DashboardSearchParams, current: DashboardSearchParams): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...next };
  for (const [key, value] of Object.entries(merged)) {
    // A one-time notice stays on the page that showed it.
    if (value && value !== 'ALL' && key !== 'notice') {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function issueMatchesFilter(issue: DashboardIssue, filters: DashboardSearchParams): boolean {
  if (filters.category && filters.category !== 'ALL' && issue.category !== filters.category) return false;
  if (filters.severity && filters.severity !== 'ALL' && issue.severity !== filters.severity) return false;
  if (filters.status && filters.status !== 'ALL' && issue.status !== filters.status) return false;
  if (filters.page && filters.page !== 'ALL' && !issueReferencesPage(issue, filters.page)) return false;
  if (filters.browser && !issue.occurrences.some((occurrence) => occurrence.browser === filters.browser)) return false;
  if (filters.viewport && !issue.occurrences.some((occurrence) => occurrence.device === filters.viewport)) return false;
  if (filters.kind === 'DETERMINISTIC' && !issue.description.includes('"deterministicFirst":true')) return false;
  if (filters.kind === 'GUIDED_REVIEW' && issue.description.includes('"deterministicFirst":true')) return false;
  const query = filters.q?.trim().toLowerCase();
  if (query && !`${issue.title} ${issue.description} ${issue.category} ${issue.severity}`.toLowerCase().includes(query)) return false;
  return true;
}

function issueReferencesPage(issue: DashboardIssue, page: string): boolean {
  const pageNeedle = page.toLowerCase();
  const description = issue.description.toLowerCase();
  if (description.includes(pageNeedle)) {
    return true;
  }

  return issue.occurrences.some((occurrence) => occurrence.evidencePath?.toLowerCase().includes(pageNeedle));
}

async function ensureDefaultWorkspace() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'SiteScope Workspace', slug: 'sitescope-workspace' }
    });
  }

  return { org };
}

function uniqueValues(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function readIssuePageUrl(description: string): string | null {
  const jsonMatch = description.match(/"pageUrl":"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].replaceAll('\\/', '/');
  }

  const textMatch = description.match(/pageUrl=([^\s]+)/);
  return textMatch?.[1] ?? null;
}

export async function getDashboardData(searchParams: DashboardSearchParams = {}) {
  const { org } = await ensureDefaultWorkspace();

  const runSelect = {
    id: true,
    status: true,
    scanMode: true,
    scopeConfig: true,
    createdAt: true,
    updatedAt: true,
    environment: {
      select: { id: true, name: true, targetUrl: true, projectId: true, createdAt: true }
    },
    caseRuns: {
      select: {
        id: true, name: true, status: true, durationMs: true,
        stepRuns: {
          select: { id: true, action: true, status: true, target: true, durationMs: true, errorMessage: true, createdAt: true },
          orderBy: { createdAt: 'asc' as const }
        }
      }
    }
  } as const;
  const runs = await prisma.testRun.findMany({
    orderBy: { createdAt: 'desc' },
    select: runSelect,
    take: 12
  });

  const selectedRun = searchParams.runId
    ? runs.find((run) => run.id === searchParams.runId) ?? await prisma.testRun.findUnique({ where: { id: searchParams.runId }, select: runSelect }) ?? undefined
    : runs[0];
  const selectedRunId = selectedRun?.id;
  const issueWhere = selectedRunId ? { occurrences: { some: { testRunId: selectedRunId } } } : {};

  const allIssues = await prisma.issue.findMany({
    where: issueWhere,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      occurrences: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
  const issues = allIssues.filter((issue) => issueMatchesFilter(issue, searchParams)).slice(0, 30);

  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const metrics = await prisma.runMetric.findMany({
    where: selectedRunId ? { testRunId: selectedRunId } : {},
    orderBy: { createdAt: 'desc' },
    take: 24
  });

  const profiles = await prisma.testProfile.findMany({
    where: { project: { organizationId: org.id }, name: { not: { startsWith: 'Run configuration ' } } },
    orderBy: { createdAt: 'desc' },
    take: 8
  });

  const runEvents = await prisma.runEvent.findMany({
    where: selectedRunId ? { testRunId: selectedRunId } : {},
    orderBy: { createdAt: 'desc' },
    take: 40
  });

  const liveRunProgress = await getLiveRunProgress(selectedRunId);
  const [totalRuns, activeRuns, failedRuns, openIssues, severityGroups, categoryGroups, runStatusGroups] = await Promise.all([
    prisma.testRun.count(),
    prisma.testRun.count({ where: { status: { in: ['QUEUED', 'PROVISIONING', 'RUNNING', 'EXECUTING', 'DISCOVERING', 'PLANNING', 'ANALYZING'] } } }),
    prisma.testRun.count({ where: { status: { in: ['FAILED', 'TIMED_OUT', 'PARTIALLY_COMPLETED'] } } }),
    prisma.issue.count({ where: { ...issueWhere, status: 'OPEN' } }),
    prisma.issue.groupBy({ by: ['severity'], where: issueWhere, _count: { _all: true } }),
    prisma.issue.groupBy({ by: ['category'], where: issueWhere, _count: { _all: true } }),
    prisma.testRun.groupBy({ by: ['status'], _count: { _all: true } })
  ]);

  const issueCountBySeverity = Object.fromEntries(severityGroups.map((group) => [group.severity, group._count._all]));
  const issueCountByCategory = Object.fromEntries(categoryGroups.map((group) => [group.category, group._count._all]));
  const categoryOrder = Array.from(new Set([...resultCategoryOrder, ...Object.keys(issueCountByCategory).sort()]));

  const latestRunScope = selectedRun ? readScopeConfigPreview(selectedRun.scopeConfig) : {};
  const runTargetPages = runs.flatMap((run) => run.caseRuns.flatMap((caseRun) => caseRun.stepRuns.map((step) => step.target)));
  const issueTargetPages = allIssues.map((issue) => readIssuePageUrl(issue.description));
  const targetPages = uniqueValues([...runTargetPages, ...issueTargetPages]);
  const browsers = uniqueValues(allIssues.flatMap((issue) => issue.occurrences.map((occurrence) => occurrence.browser)));
  const viewports = uniqueValues(allIssues.flatMap((issue) => issue.occurrences.map((occurrence) => occurrence.device)));

  const statusCounts = Object.fromEntries(runStatusGroups.map((group) => [group.status, group._count._all]));

  return {
    org,
    runs,
    totalRuns,
    selectedRun,
    profiles,
    issues,
    allIssues,
    auditLogs,
    metrics,
    runEvents,
    liveRunProgress,
    activeRuns,
    failedRuns,
    openIssues,
    issueCountBySeverity,
    issueCountByCategory,
    latestRunScope,
    targetPages,
    browsers,
    viewports,
    statusCounts,
    categoryOrder,
    locale: searchParams.locale === 'ar' ? 'ar' : 'en',
    direction: searchParams.dir === 'rtl' ? 'rtl' : 'ltr'
  };
}
