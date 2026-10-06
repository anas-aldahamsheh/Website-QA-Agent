'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@sentinelqa/database';
import { pushTestRunJob, getTestRunsQueue, createRedisConnection } from '@sentinelqa/queue';
import { isPublicMode, validateTargetUrl } from '@sentinelqa/security';
import { fork } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from '@sentinelqa/logger';
import { CheckIdSchema, IMPLEMENTED_CHECK_IDS, IssueFeedbackStatusSchema, ScanModeSchema, ScopeConfigSchema, limitScopeForPublic } from '@sentinelqa/contracts';
import { countLiveRuns } from '@/server/queries/run-progress';

function serializeJson(data: unknown): string {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

function runDirectScan(runId: string): boolean {
  logger.info({ runId }, 'Spawning direct local background scan process');
  try {
    const runnerPath = path.resolve(process.cwd(), '../worker/dist/runner.js');
    if (!existsSync(runnerPath)) {
      logger.warn({ runnerPath, runId }, 'Built local runner unavailable; run remains queued for the polling worker');
      return false;
    }
    const child = fork(runnerPath, [runId], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return true;
  } catch (err) {
    logger.error({ err, runId }, 'Failed to spawn background scan process');
    return false;
  }
}

// The public demo runs one scan at a time on its owner's machine; a visitor who comes while one
// is running goes back to the Run Center with a note to try again shortly.
async function sendBackWhenPublicDemoIsBusy() {
  if (isPublicMode() && (await countLiveRuns()) > 0) {
    redirect('/?notice=scan-busy');
  }
}

function assertNotPublicDemo(feature: string) {
  if (isPublicMode()) {
    throw new Error(`${feature} is not available on the public demo`);
  }
}

function revalidateDashboardViews() {
  revalidatePath('/');
  revalidatePath('/Run%20Center');
  revalidatePath('/results');
}

// Helper to extract scope configurations from Form Data
function parseScopeConfig(formData: FormData) {
  return {
    maxPages: Number(formData.get('maxPages') || 100),
    maxRequests: Number(formData.get('maxRequests') || 500),
    maxDepth: Number(formData.get('maxDepth') || 5),
    maxExecutionTime: Number(formData.get('maxExecutionTime') || 30),
    crawlBudgetPerDomain: Number(formData.get('crawlBudgetPerDomain') || 500),
    maxErrors: Number(formData.get('maxErrors') || 10),
    maxFileSizeDownload: Number(formData.get('maxFileSizeDownload') || 50),
    maxPagesPerTemplate: Number(formData.get('maxPagesPerTemplate') || 10),
    maxUrlsPerPathPattern: Number(formData.get('maxUrlsPerPathPattern') || 50),
    maxQueryParamVariants: Number(formData.get('maxQueryParamVariants') || 5),
    maxPaginationDepth: Number(formData.get('maxPaginationDepth') || 10),
    maxRedirectDepth: Number(formData.get('maxRedirectDepth') || 5),
    maxAssetCount: Number(formData.get('maxAssetCount') || 200),
    maxExternalLinks: Number(formData.get('maxExternalLinks') ?? 50),
    maxScreenshots: Number(formData.get('maxScreenshots') ?? 100),
    maxVideoTraceStorage: Number(formData.get('maxVideoTraceStorage') || 100),
    concurrency: 1,
    requestsPerSecond: Number(formData.get('requestsPerSecond') || 10),
    delayBetweenPages: Number(formData.get('delayBetweenPages') ?? 500),
    timeoutPerPage: Number(formData.get('timeoutPerPage') || 30),
    timeoutPerAction: Number(formData.get('timeoutPerAction') || 10),
    retryCount: Number(formData.get('retryCount') ?? 3),
    perHostConcurrency: 1,
    requestsPerSecondPerHost: Number(formData.get('requestsPerSecondPerHost') || 2),
    htmlPageConcurrency: Number(formData.get('htmlPageConcurrency') || 1),
    apiConcurrency: Number(formData.get('apiConcurrency') || 0),
    assetConcurrency: Number(formData.get('assetConcurrency') || 0),
    externalLinkConcurrency: Number(formData.get('externalLinkConcurrency') || 0),
    navigationDelayMinMs: Number(formData.get('navigationDelayMinMs') ?? 100),
    navigationDelayMaxMs: Number(formData.get('navigationDelayMaxMs') ?? 500),
    maximumRetryAttempts: Number(formData.get('maximumRetryAttempts') ?? 3),
    maximumHostPauseMs: Number(formData.get('maximumHostPauseMs') || 120000),
    circuitBreakerFailureThreshold: Number(formData.get('circuitBreakerFailureThreshold') || 3),
    circuitBreakerCooldownMs: Number(formData.get('circuitBreakerCooldownMs') || 30000),
    retryableStatusCodes: formData.get('retryableStatusCodes') ? (formData.get('retryableStatusCodes') as string).split(',').map((status) => Number(status.trim())).filter((status) => Number.isInteger(status)) : [429, 503],
    identifyScanner: formData.get('identifyScanner') !== 'false',
    scannerUserAgentProduct: (formData.get('scannerUserAgentProduct') as string) || 'SiteScope-Scanner',
    scannerContact: (formData.get('scannerContact') as string) || undefined,
    stopOnCriticalError: formData.get('stopOnCriticalError') !== 'false',
    continueOnPartialFailure: formData.get('continueOnPartialFailure') !== 'false',
    seedUrls: formData.get('seedUrls') ? (formData.get('seedUrls') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    includePatterns: formData.get('includePatterns') ? (formData.get('includePatterns') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    excludePatterns: formData.get('excludePatterns') ? (formData.get('excludePatterns') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    includeRegexes: formData.get('includeRegexes') ? (formData.get('includeRegexes') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    excludeRegexes: formData.get('excludeRegexes') ? (formData.get('excludeRegexes') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    queryParamAllowlist: formData.get('queryParamAllowlist') ? (formData.get('queryParamAllowlist') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    queryParamDenylist: formData.get('queryParamDenylist') ? (formData.get('queryParamDenylist') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    fragmentPolicy: formData.get('fragmentPolicy') || 'IGNORE',
    protocolPolicy: formData.get('protocolPolicy') || 'HTTP_AND_HTTPS',
    subdomainPolicy: formData.get('subdomainPolicy') || 'STRICT',
    externalDomainPolicy: formData.get('externalDomainPolicy') || 'BLOCK',
    assetDomainPolicy: formData.get('assetDomainPolicy') || 'BLOCK',
    localePaths: formData.get('localePaths') ? (formData.get('localePaths') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    authenticatedPaths: formData.get('authenticatedPaths') ? (formData.get('authenticatedPaths') as string).split(',').map(s => s.trim()).filter(Boolean) : undefined,
    adminAreaExclusion: formData.get('adminAreaExclusion') !== 'false',
    logoutUrlProtection: formData.get('logoutUrlProtection') !== 'false',
    destructiveActionProtection: formData.get('destructiveActionProtection') !== 'false'
  };
}

function parseSelectedChecks(formData: FormData) {
  const checks = CheckIdSchema.array().parse(formData.getAll('checks'));
  const supported = new Set<string>(IMPLEMENTED_CHECK_IDS);
  if (checks.length === 0 || checks.some((check) => !supported.has(check))) {
    throw new Error('Select at least one available check');
  }
  return checks;
}

// Trigger a new autonomous test run from the UI form
export async function triggerTestRunAction(formData: FormData) {
  const targetUrl = String(formData.get('targetUrl') ?? '').trim();
  const rawChecks = parseSelectedChecks(formData);
  const rawScanMode = formData.get('scanMode') as string;
  
  const scanMode = ScanModeSchema.parse(rawScanMode || 'STANDARD');
  const requestedScope = ScopeConfigSchema.parse(parseScopeConfig(formData));
  const scopeConfig = isPublicMode() ? limitScopeForPublic(requestedScope) : requestedScope;

  logger.info({ selectedCheckCount: rawChecks.length, scanMode }, 'triggerTestRunAction triggered');

  if (!targetUrl) {
    throw new Error('Target URL is required');
  }
  const normalizedTargetUrl = new URL(targetUrl).toString();

  // 1. SSRF prevention lookup check
  const isValid = await validateTargetUrl(normalizedTargetUrl);
  if (!isValid) {
    logger.warn('Blocked trigger run command due to invalid target URL (SSRF)');
    throw new Error('Target URL violates network security policy (SSRF block)');
  }

  await sendBackWhenPublicDemoIsBusy();

  // 2. Fetch or create default Organization / Project for demo/vertical slice
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Default Org',
        slug: 'default-org'
      }
    });
  }

  let project = await prisma.project.findFirst({
    where: { organizationId: org.id, domain: new URL(normalizedTargetUrl).host }
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: 'Demo Project',
        domain: new URL(normalizedTargetUrl).host
      }
    });
  }

  let env = await prisma.environment.findFirst({
    where: { projectId: project.id, targetUrl: normalizedTargetUrl }
  });
  if (!env) {
    env = await prisma.environment.create({
      data: {
        projectId: project.id,
        name: 'STAGING',
        targetUrl: normalizedTargetUrl
      }
    });
  }

  // A run owns an immutable configuration snapshot. Saved profiles remain reusable.
  const profile = await prisma.testProfile.create({
    data: {
      projectId: project.id,
      name: `Run configuration ${new Date().toISOString()}`,
      config: serializeJson({ checks: rawChecks, scanMode, targetUrl: normalizedTargetUrl, scopeConfig })
    }
  });

  // 3. Create the TestRun database record in QUEUED status
  const run = await prisma.testRun.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      environmentId: env.id,
      testProfileId: profile.id,
      status: 'QUEUED',
      scanMode,
      scopeConfig: serializeJson(scopeConfig)
    }
  });

  await prisma.runEvent.create({
    data: {
      testRunId: run.id,
      type: 'LOG',
      message: `Check configuration locked: selectedByUser=${rawChecks.length}, totalExecuted=${rawChecks.length}.`,
      metadata: serializeJson({
        resultSection: 'OVERVIEW',
        selectedByUser: rawChecks.length,
        enabledByDependency: 0,
        lockedByOrganizationPolicy: 0,
        disabledByConflict: 0,
        totalExecuted: rawChecks.length,
        checks: rawChecks
      })
    }
  });

  // 4. Background Execution: Redis Queue (if configured) or Direct Local Background Runner
  const redisUrl = process.env['REDIS_URL'];
  if (redisUrl) {
    try {
      const redisConnection = createRedisConnection();
      const queue = getTestRunsQueue(redisConnection);

      await pushTestRunJob(queue, {
        version: 1,
        runId: run.id,
        projectId: project.id,
        environmentId: env.id,
        targetUrl: normalizedTargetUrl,
        scanMode,
        scopeConfig,
        browsers: ['chromium'],
        checks: rawChecks
      });

      logger.info({ runId: run.id }, 'Enqueued run job to BullMQ');
      await queue.close();
      await redisConnection.quit();
    } catch (queueError) {
      logger.warn({ queueError }, 'Failed to enqueue to Redis, falling back to direct background execution');
      runDirectScan(run.id);
    }
  } else {
    // Direct local execution without Redis / Docker
    runDirectScan(run.id);
  }

  revalidateDashboardViews();
}

// Clear all database records and drain test runs queue
export async function clearAllDataAction() {
  assertNotPublicDemo('Clearing data');
  logger.info('clearAllDataAction triggered - purging database and queues');

  try {
    // Delete in dependency order
    await prisma.auditLog.deleteMany({});
    await prisma.artifact.deleteMany({});
    await prisma.issueAssignment.deleteMany({});
    await prisma.issueOccurrence.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.runMetric.deleteMany({});
    await prisma.runEvent.deleteMany({});
    await prisma.stepRun.deleteMany({});
    await prisma.testCaseRun.deleteMany({});
    await prisma.testRun.deleteMany({});
    await prisma.testProfile.deleteMany({});
    await prisma.environment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.organization.deleteMany({});

    // Drain the Redis queue if configured
    if (process.env['REDIS_URL']) {
      try {
        const redisConnection = createRedisConnection();
        const queue = getTestRunsQueue(redisConnection);
        await queue.drain();
        await queue.close();
        await redisConnection.quit();
      } catch (redisError) {
        logger.warn({ redisError }, 'Redis queue drain skipped');
      }
    }

    logger.info('Database and queues purged successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to clear all data');
    throw error;
  }

  revalidateDashboardViews();
}

// Save a new configuration as a reusable profile
export async function saveTestProfileAction(formData: FormData) {
  assertNotPublicDemo('Saving profiles');
  const name = String(formData.get('profileName') ?? '').trim().slice(0, 80) || 'My Configuration Profile';
  const targetUrl = String(formData.get('targetUrl') ?? '').trim();
  const rawChecks = parseSelectedChecks(formData);
  const rawScanMode = formData.get('scanMode') as string;
  const scanMode = ScanModeSchema.parse(rawScanMode || 'STANDARD');
  const scopeConfig = ScopeConfigSchema.parse(parseScopeConfig(formData));

  logger.info({ name, scanMode, selectedCheckCount: rawChecks.length }, 'saveTestProfileAction triggered');

  if (!(await validateTargetUrl(targetUrl))) {
    throw new Error('Enter a public HTTP or HTTPS target before saving a profile');
  }
  const normalizedTargetUrl = new URL(targetUrl).toString();
  const domain = new URL(normalizedTargetUrl).host;

  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Default Org', slug: 'default-org' }
    });
  }
  let project = await prisma.project.findFirst({ where: { organizationId: org.id, domain } });
  if (!project) {
    project = await prisma.project.create({
      data: { organizationId: org.id, name: 'Demo Project', domain }
    });
  }

  await prisma.testProfile.create({
    data: {
      projectId: project.id,
      name,
      config: serializeJson({
        checks: rawChecks,
        scanMode,
        targetUrl: normalizedTargetUrl,
        scopeConfig
      })
    }
  });

  revalidateDashboardViews();
}

// Duplicate and version an existing profile
export async function duplicateTestProfileAction(profileId: string) {
  assertNotPublicDemo('Saving profiles');
  logger.info({ profileId }, 'duplicateTestProfileAction triggered');

  const existingProfile = await prisma.testProfile.findUnique({
    where: { id: profileId }
  });

  if (!existingProfile) {
    throw new Error('Profile not found');
  }

  const copyName = `${existingProfile.name} (Copy)`;

  await prisma.testProfile.create({
    data: {
      projectId: existingProfile.projectId,
      name: copyName,
      config: typeof existingProfile.config === 'string' ? existingProfile.config : serializeJson(existingProfile.config || {})
    }
  });

  revalidateDashboardViews();
}

export async function updateIssueStatusAction(issueId: string, status: string) {
  const parsedStatus = IssueFeedbackStatusSchema.parse(status);
  await prisma.issue.update({
    where: { id: issueId },
    data: { status: parsedStatus }
  });

  await prisma.auditLog.create({
    data: {
      action: `ISSUE_${parsedStatus}`,
      entityType: 'Issue',
      entityId: issueId,
      details: serializeJson({ status: parsedStatus })
    }
  });

  revalidateDashboardViews();
}

export async function updateIssueStatusFormAction(formData: FormData) {
  const issueId = formData.get('issueId');
  const status = formData.get('status');

  if (typeof issueId !== 'string' || typeof status !== 'string') {
    throw new Error('Invalid issue status update payload');
  }

  await updateIssueStatusAction(issueId, status);
}

export async function cancelRunAction(runId: string) {
  const updateResult = await prisma.testRun.updateMany({
    where: {
      id: runId,
      status: {
        notIn: ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT']
      }
    },
    data: { status: 'CANCELED', completedAt: new Date() }
  });

  if (updateResult.count > 0) {
    await prisma.runEvent.create({
      data: {
        testRunId: runId,
        type: 'WARNING',
        message: 'Emergency stop requested from dashboard.',
        metadata: serializeJson({ resultSection: 'SCAN_ENVIRONMENT', operatorAction: 'CANCELED' })
      }
    });
  }

  revalidateDashboardViews();
}

export async function resumeRunAction(runId: string) {
  const prior = await prisma.testRun.findUniqueOrThrow({
    where: { id: runId },
    include: { environment: true, testProfile: true }
  });
  if (!['CANCELED', 'FAILED', 'TIMED_OUT'].includes(prior.status)) {
    throw new Error('Only stopped or failed runs can be retried');
  }
  await sendBackWhenPublicDemoIsBusy();

  // Retrying in a fresh run prevents the old worker from writing into the new attempt.
  const retry = await prisma.testRun.create({
    data: {
      organizationId: prior.organizationId,
      projectId: prior.projectId,
      environmentId: prior.environmentId,
      testProfileId: prior.testProfileId,
      status: 'QUEUED',
      scanMode: prior.scanMode,
      scopeConfig: prior.scopeConfig
    }
  });

  await prisma.runEvent.create({
    data: {
      testRunId: retry.id,
      type: 'LOG',
      message: `Retry created from run ${runId}.`,
      metadata: serializeJson({ resultSection: 'SCAN_ENVIRONMENT', operatorAction: 'RETRIED', previousRunId: runId })
    }
  });

  if (process.env['REDIS_URL']) {
    const redisConnection = createRedisConnection();
    const queue = getTestRunsQueue(redisConnection);
    try {
      const config = JSON.parse(prior.testProfile.config) as { checks?: unknown };
      await pushTestRunJob(queue, {
        version: 1,
        runId: retry.id,
        projectId: retry.projectId,
        environmentId: retry.environmentId,
        targetUrl: prior.environment.targetUrl,
        scanMode: ScanModeSchema.parse(prior.scanMode),
        scopeConfig: ScopeConfigSchema.parse(prior.scopeConfig ? JSON.parse(prior.scopeConfig) : {}),
        browsers: ['chromium'],
        checks: CheckIdSchema.array().parse(config.checks ?? [])
      });
    } finally {
      await queue.close();
      await redisConnection.quit();
    }
  } else {
    runDirectScan(retry.id);
  }

  revalidateDashboardViews();
}
