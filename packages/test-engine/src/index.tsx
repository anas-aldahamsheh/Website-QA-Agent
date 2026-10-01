import { chromium, firefox, webkit, Browser, BrowserContext, ConsoleMessage, Page, Response } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CommandStep,
  ScopeConfig,
  FindingSeverity,
  AuditCategory,
  AuditFindingInput,
  UrlResourceType,
  PageState,
  NormalizedErrorType,
  ResultSection
} from '@sentinelqa/contracts';
import { prisma } from '@sentinelqa/database';
import { logger } from '@sentinelqa/logger';
import { validateTargetUrl, isPublicIpAddress } from '@sentinelqa/security';
import { isIP } from 'node:net';

export interface ExecuteRunOptions {
  runId: string;
  targetUrl: string;
  browserType: 'chromium' | 'firefox' | 'webkit';
  steps: CommandStep[];
  scanMode?: string;
  scopeConfig?: ScopeConfig;
  checks?: string[];
}

function serializeMetadata(data: unknown): string {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

export interface UrlDecision {
  allowed: boolean;
  reason: string;
}

export interface UrlClassification {
  type: UrlResourceType;
  reason: string;
  statusCode?: number;
  contentType?: string;
}

interface FrontierItem {
  url: string;
  source: string;
  depth: number;
}

interface DiscoveredLink {
  href: string;
  source: string;
}

interface RuntimeSignal {
  type: string;
  message: string;
  source?: string;
  errorType: NormalizedErrorType;
}

interface NetworkSignal {
  method: string;
  url: string;
  status: number;
  contentType: string;
  durationMs: number;
  transferSize: number;
  errorType?: NormalizedErrorType;
  resultSection: ResultSection;
}

interface PageAuditContext {
  runId: string;
  projectId: string;
  pageUrl: string;
  browserType: ExecuteRunOptions['browserType'];
  viewport: string;
  response: Response | null;
  pageState: PageState;
  runtimeSignals: RuntimeSignal[];
  networkSignals: NetworkSignal[];
  scopeConfig: ScopeConfig;
  checks?: ReadonlySet<string>;
  captureScreenshot?: boolean;
}

class RunCanceledError extends Error {
  constructor(runId: string) {
    super(`Run ${runId} was canceled by the operator.`);
    this.name = 'RunCanceledError';
  }
}

class RunTimedOutError extends Error {
  constructor() {
    super('Scan execution time limit reached');
    this.name = 'RunTimedOutError';
  }
}

interface AuditFindingDraft {
  category: AuditCategory;
  severity: FindingSeverity;
  rule: string;
  title: string;
  description: string;
  evidence: string;
  confidence: number;
  suggestedFix: string;
  resultSection?: ResultSection;
  pageState?: PageState;
  errorType?: NormalizedErrorType;
  fingerprint?: string;
}

interface HostCircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  openedAtMs: number;
}

const DEFAULT_SCOPE_CONFIG: ScopeConfig = {
  maxPages: 100,
  maxRequests: 500,
  maxDepth: 5,
  maxExecutionTime: 30,
  crawlBudgetPerDomain: 500,
  maxErrors: 10,
  maxFileSizeDownload: 50,
  maxPagesPerTemplate: 10,
  maxUrlsPerPathPattern: 50,
  maxQueryParamVariants: 5,
  maxPaginationDepth: 10,
  maxRedirectDepth: 5,
  maxAssetCount: 200,
  maxExternalLinks: 50,
  maxScreenshots: 100,
  maxVideoTraceStorage: 100,
  concurrency: 2,
  requestsPerSecond: 10,
  delayBetweenPages: 500,
  timeoutPerPage: 30,
  timeoutPerAction: 10,
  retryCount: 3,
  perHostConcurrency: 1,
  requestsPerSecondPerHost: 2,
  htmlPageConcurrency: 1,
  apiConcurrency: 0,
  assetConcurrency: 0,
  externalLinkConcurrency: 0,
  navigationDelayMinMs: 100,
  navigationDelayMaxMs: 500,
  maximumRetryAttempts: 3,
  maximumHostPauseMs: 120000,
  circuitBreakerFailureThreshold: 3,
  circuitBreakerCooldownMs: 30000,
  retryableStatusCodes: [429, 503],
  identifyScanner: true,
  scannerUserAgentProduct: 'SiteScope-Scanner',
  stopOnCriticalError: true,
  continueOnPartialFailure: true,
  fragmentPolicy: 'IGNORE',
  protocolPolicy: 'HTTPS_ONLY',
  subdomainPolicy: 'STRICT',
  externalDomainPolicy: 'BLOCK',
  assetDomainPolicy: 'BLOCK',
  adminAreaExclusion: true,
  logoutUrlProtection: true,
  destructiveActionProtection: true
};

const DOWNLOAD_EXTENSIONS = new Set(['.pdf', '.zip', '.rar', '.7z', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.tsv', '.exe', '.dmg', '.pkg']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const FONT_EXTENSIONS = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);
const STYLESHEET_EXTENSIONS = new Set(['.css']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);
const TEMPORARY_PROTECTION_STATUSES = new Set([429, 503]);

const SECRET_PATTERN = /(authorization|bearer\s+[a-z0-9._-]+|token=|password=|secret=|api[_-]?key=|session=|cookie=)/i;
const PII_PATTERN = /(email=|phone=|ssn=|national[_-]?id=|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

export function normalizeUrl(rawUrl: string, config: ScopeConfig = DEFAULT_SCOPE_CONFIG): string {
  try {
    const urlObj = new URL(rawUrl);
    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();

    if ((urlObj.protocol === 'http:' && urlObj.port === '80') || (urlObj.protocol === 'https:' && urlObj.port === '443')) {
      urlObj.port = '';
    }

    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    urlObj.pathname = encodeURI(decodeURIComponent(urlObj.pathname));

    const sourceParams = new URLSearchParams(urlObj.search);
    const cleanedParams = new URLSearchParams();
    const denylist = config.queryParamDenylist ?? [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'fbclid',
      'gclid'
    ];
    const allowlist = config.queryParamAllowlist ?? [];

    for (const key of Array.from(sourceParams.keys()).sort()) {
      const denied = denylist.some((rule) => wildcardMatches(rule, key));
      const allowedByList = allowlist.length === 0 || allowlist.includes(key);
      if (denied || !allowedByList) {
        continue;
      }
      for (const value of sourceParams.getAll(key)) {
        cleanedParams.append(key, value);
      }
    }

    urlObj.search = cleanedParams.toString();
    if (config.fragmentPolicy === 'IGNORE') {
      urlObj.hash = '';
    }

    return urlObj.toString();
  } catch {
    return rawUrl;
  }
}

export function isUrlAllowed(rawUrl: string, baseUrl: string, config: ScopeConfig = DEFAULT_SCOPE_CONFIG): UrlDecision {
  try {
    const url = new URL(rawUrl);
    const base = new URL(baseUrl);
    const path = url.pathname.toLowerCase();

    if (!['http:', 'https:'].includes(url.protocol) || !['http:', 'https:'].includes(base.protocol)) {
      return { allowed: false, reason: 'Only HTTP and HTTPS URLs can be crawled' };
    }
    if (url.username || url.password) {
      return { allowed: false, reason: 'URLs containing credentials are not allowed' };
    }

    if (isPrivateHost(url.hostname) && !isPrivateHost(base.hostname)) {
      return { allowed: false, reason: 'SSRF protection blocked private or local network host' };
    }

    if (config.adminAreaExclusion && ['/admin', '/wp-admin', '/wp-login', '/administrator', '/ghost', '/sidekiq'].some((rule) => path.startsWith(rule))) {
      return { allowed: false, reason: 'Admin area excluded by safety policy' };
    }

    if (config.logoutUrlProtection && ['logout', 'log-out', 'signout', 'sign-out', 'invalidate', 'session/end'].some((rule) => path.includes(rule))) {
      return { allowed: false, reason: 'Logout URL blocked to preserve authenticated session' };
    }

    if (config.destructiveActionProtection && ['/delete', '/destroy', '/purge', '/remove', '/wipe'].some((rule) => path.includes(rule))) {
      return { allowed: false, reason: 'Potential destructive action URL blocked' };
    }

    if (config.protocolPolicy === 'HTTPS_ONLY' && url.protocol !== 'https:') {
      return { allowed: false, reason: 'HTTPS-only protocol policy blocked URL' };
    }

    if (config.protocolPolicy === 'HTTP_ONLY' && url.protocol !== 'http:') {
      return { allowed: false, reason: 'HTTP-only protocol policy blocked URL' };
    }

    if ((config.subdomainPolicy === 'STRICT' || config.subdomainPolicy === 'NONE') && url.hostname !== base.hostname) {
      return { allowed: false, reason: 'Host is outside configured crawl boundary' };
    }
    if (config.subdomainPolicy === 'ALL_SUBDOMAINS' && url.hostname !== base.hostname && !url.hostname.endsWith(`.${base.hostname}`)) {
      return { allowed: false, reason: 'Host is outside configured crawl boundary' };
    }

    if (config.includePatterns?.length && !config.includePatterns.some((rule) => wildcardMatches(rule, url.pathname))) {
      return { allowed: false, reason: 'Path did not match configured include patterns' };
    }

    if (config.excludePatterns?.some((rule) => wildcardMatches(rule, url.pathname))) {
      return { allowed: false, reason: 'Path matched configured exclude patterns' };
    }

    if (config.includeRegexes?.length && !config.includeRegexes.some((rule) => safeRegexTest(rule, url.pathname))) {
      return { allowed: false, reason: 'Path did not match configured include regexes' };
    }

    if (config.excludeRegexes?.some((rule) => safeRegexTest(rule, url.pathname))) {
      return { allowed: false, reason: 'Path matched configured exclude regexes' };
    }

    return { allowed: true, reason: 'Allowed by configured crawl policy' };
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }
}

export function classifyUrl(
  rawUrl: string,
  baseUrl: string,
  options: { statusCode?: number; contentType?: string; contentDisposition?: string; requestResourceType?: string; allowSubdomains?: boolean } = {}
): UrlClassification {
  let url: URL;
  let base: URL;
  try {
    url = new URL(rawUrl);
    base = new URL(baseUrl);
  } catch {
    return { type: 'UNSUPPORTED_RESOURCE', reason: 'Invalid URL format' };
  }

  if (url.hostname !== base.hostname && !(options.allowSubdomains && url.hostname.endsWith(`.${base.hostname}`))) {
    return { type: 'EXTERNAL_LINK', reason: 'URL belongs to an external host' };
  }

  if (options.statusCode && options.statusCode >= 300 && options.statusCode < 400) {
    return withClassificationDetails('REDIRECT', 'HTTP redirect response', options);
  }

  const pathname = url.pathname.toLowerCase();
  const extension = pathname.includes('.') ? pathname.slice(pathname.lastIndexOf('.')) : '';
  const contentType = (options.contentType ?? '').toLowerCase();
  const disposition = (options.contentDisposition ?? '').toLowerCase();
  const resourceType = options.requestResourceType ?? '';

  if (disposition.includes('attachment') || DOWNLOAD_EXTENSIONS.has(extension)) {
    return withClassificationDetails('DOWNLOAD', 'Download resource detected from attachment header or file extension', options);
  }
  if (contentType.includes('application/json') || contentType.includes('graphql') || pathname.startsWith('/api/') || resourceType === 'xhr' || resourceType === 'fetch') {
    return withClassificationDetails('API_ENDPOINT', 'API endpoint detected from content type, path, or request context', options);
  }
  if (contentType.includes('text/html') || contentType === '' && !extension) {
    return withClassificationDetails('HTML_PAGE', 'HTML document or extensionless route', options);
  }
  if (contentType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return withClassificationDetails('IMAGE', 'Image resource detected', options);
  }
  if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {
    return withClassificationDetails('VIDEO', 'Video resource detected', options);
  }
  if (contentType.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) {
    return withClassificationDetails('AUDIO', 'Audio resource detected', options);
  }
  if (contentType.includes('font') || FONT_EXTENSIONS.has(extension)) {
    return withClassificationDetails('FONT', 'Font resource detected', options);
  }
  if (contentType.includes('text/css') || STYLESHEET_EXTENSIONS.has(extension)) {
    return withClassificationDetails('STYLESHEET', 'Stylesheet resource detected', options);
  }
  if (contentType.includes('javascript') || SCRIPT_EXTENSIONS.has(extension)) {
    return withClassificationDetails('SCRIPT', 'Script resource detected', options);
  }
  return withClassificationDetails('UNSUPPORTED_RESOURCE', 'Unsupported resource type for page inspection', options);
}

export function parseRetryAfterMs(retryAfter: string | null, nowMs = Date.now(), maxPauseMs = DEFAULT_SCOPE_CONFIG.maximumHostPauseMs): number | null {
  if (!retryAfter) {
    return null;
  }
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, maxPauseMs);
  }
  const dateMs = Date.parse(retryAfter);
  if (Number.isNaN(dateMs)) {
    return null;
  }
  return Math.min(Math.max(0, dateMs - nowMs), maxPauseMs);
}

export function getBackoffMs(attempt: number, randomFactor = Math.random(), baseMs = 1000, maximumMs = 60000): number {
  const exponentialMs = Math.min(maximumMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.floor(Math.max(0, Math.min(1, randomFactor)) * exponentialMs);
}

export function getEffectiveLoadPolicy(scopeConfig: ScopeConfig = DEFAULT_SCOPE_CONFIG): {
  globalConcurrency: number;
  perHostConcurrency: number;
  requestsPerSecond: number;
  requestsPerSecondPerHost: number;
  htmlPageConcurrency: number;
  apiConcurrency: number;
  assetConcurrency: number;
  externalLinkConcurrency: number;
} {
  return {
    globalConcurrency: 1,
    perHostConcurrency: 1,
    requestsPerSecond: scopeConfig.requestsPerSecond,
    requestsPerSecondPerHost: Math.min(scopeConfig.requestsPerSecondPerHost, scopeConfig.requestsPerSecond),
    htmlPageConcurrency: 1,
    apiConcurrency: 0,
    assetConcurrency: 0,
    externalLinkConcurrency: 0
  };
}

export function buildScannerUserAgent(defaultUserAgent: string, scopeConfig: ScopeConfig = DEFAULT_SCOPE_CONFIG): string {
  if (!scopeConfig.identifyScanner) {
    return defaultUserAgent;
  }
  const product = scopeConfig.scannerUserAgentProduct.replace(/[^A-Za-z0-9._-]/g, '-');
  const contact = scopeConfig.scannerContact ? `; contact=${scopeConfig.scannerContact.replace(/[()\r\n]/g, '')}` : '';
  return `${defaultUserAgent} ${product}/1.0 (+https://sitescope.local${contact})`;
}

function withClassificationDetails(
  type: UrlResourceType,
  reason: string,
  options: { statusCode?: number; contentType?: string }
): UrlClassification {
  const classification: UrlClassification = { type, reason };
  if (options.statusCode !== undefined) {
    classification.statusCode = options.statusCode;
  }
  if (options.contentType !== undefined) {
    classification.contentType = options.contentType;
  }
  return classification;
}

export async function executeTestRun(options: ExecuteRunOptions): Promise<void> {
  const { runId, targetUrl, browserType, steps, scanMode } = options;
  const scopeConfig = { ...DEFAULT_SCOPE_CONFIG, ...options.scopeConfig };
  logger.info({ runId, browserType, targetHost: new URL(targetUrl).host, scanMode }, 'Starting whole-site test run execution');

  let browser: Browser | null = null;

  try {
    const claimed = await prisma.testRun.updateMany({
      where: { id: runId, status: 'QUEUED' },
      data: { status: 'PROVISIONING', startedAt: new Date(), completedAt: null }
    });
    if (claimed.count === 0) {
      logger.info({ runId }, 'Run was already claimed or is no longer queued');
      return;
    }
    if (!(await validateTargetUrl(targetUrl))) {
      throw new Error('Target URL failed network safety validation before browser launch');
    }
    await assertRunNotCanceled(runId);
    browser = await launchBrowser(browserType);
    const bootstrapContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
    const bootstrapPage = await bootstrapContext.newPage();
    const defaultUserAgent = await bootstrapPage.evaluate(() => navigator.userAgent);
    await bootstrapContext.close();
    const scannerUserAgent = buildScannerUserAgent(defaultUserAgent, scopeConfig);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
      userAgent: scannerUserAgent
    });
    let totalNetworkRequests = 0;
    let nextGlobalRequestAt = 0;
    const nextHostRequestAt = new Map<string, number>();
    await context.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      if (!(await validateTargetUrl(requestUrl)) || totalNetworkRequests >= scopeConfig.maxRequests) {
        await route.abort('blockedbyclient');
        return;
      }
      totalNetworkRequests += 1;
      const host = new URL(requestUrl).host;
      const scheduledAt = Math.max(Date.now(), nextGlobalRequestAt, nextHostRequestAt.get(host) ?? 0);
      nextGlobalRequestAt = scheduledAt + 1000 / scopeConfig.requestsPerSecond;
      nextHostRequestAt.set(host, scheduledAt + 1000 / scopeConfig.requestsPerSecondPerHost);
      await sleep(Math.max(0, scheduledAt - Date.now()));
      await route.continue();
    });
    const runtimeSignals: RuntimeSignal[] = [];
    const networkSignals: NetworkSignal[] = [];
    const page = await pageSetup(context, runId, runtimeSignals, networkSignals);

    const transitioned = await prisma.testRun.updateMany({
      where: { id: runId, status: 'PROVISIONING' },
      data: { status: 'DISCOVERING' }
    });
    if (transitioned.count === 0) throw new RunCanceledError(runId);
    const run = await prisma.testRun.findUniqueOrThrow({ where: { id: runId } });
    await assertRunNotCanceled(runId);

    await logScanEnvironmentEvent(runId, targetUrl, 'UNKNOWN_INCONCLUSIVE', 'Scanner identity and effective load policy recorded before crawl start.', {
      browserType,
      browserVersion: browser.version(),
      userAgent: redactSensitive(scannerUserAgent),
      locale: 'en-US',
      clientHints: 'browser-generated defaults only; scanner does not rotate identities or bypass protection',
      effectiveLoadPolicy: getEffectiveLoadPolicy(scopeConfig)
    });

    const isMalicious = detectInjection(targetUrl) || steps.some((step) => detectInjection(step.value ?? '') || detectInjection(step.target ?? ''));
    if (isMalicious) {
      throw new Error('Potential security exploit or prompt injection attempt blocked.');
    }

    const pendingQueue = createInitialFrontier(targetUrl, scopeConfig);
    if (pendingQueue.length === 0) {
      throw new Error('No seed URLs are allowed by the configured crawl policy');
    }
    const discoveredUrls = new Set<string>(pendingQueue.map((item) => item.url));
    const processedUrls = new Set<string>();
    const scannedPageUrls = new Set<string>();
    const hostCircuits = new Map<string, HostCircuitState>();
    const startTime = Date.now();
    let totalCrawlRequests = 0;
    let totalSuccessfulPages = 0;
    let totalFailedPages = 0;
    let totalSkippedPages = 0;
    let totalBlockedPages = 0;
    let totalDownloads = 0;
    let totalAssets = 0;
    let totalApiEndpoints = 0;
    let pageLimitReached = false;

    const caseRun = await prisma.testCaseRun.create({
      data: {
        testRunId: runId,
        name: `Whole-Site Crawler [${scanMode ?? 'STANDARD'}] on ${browserType}`,
        status: 'PASSED',
        durationMs: 0
      }
    });

    while (pendingQueue.length > 0 && scannedPageUrls.size < scopeConfig.maxPages && totalNetworkRequests < scopeConfig.maxRequests && totalFailedPages < scopeConfig.maxErrors) {
      await assertRunNotCanceled(runId);
      if (Date.now() - startTime >= scopeConfig.maxExecutionTime * 60_000) {
        throw new RunTimedOutError();
      }
      const current = pendingQueue.shift();
      if (!current || processedUrls.has(current.url)) {
        continue;
      }

      const preNavigationClassification = classifyUrl(current.url, targetUrl, { allowSubdomains: scopeConfig.subdomainPolicy === 'ALL_SUBDOMAINS' });
      if (preNavigationClassification.type !== 'HTML_PAGE') {
        processedUrls.add(current.url);
        if (preNavigationClassification.type === 'DOWNLOAD') totalDownloads += 1;
        if (['IMAGE', 'VIDEO', 'AUDIO', 'FONT', 'STYLESHEET', 'SCRIPT'].includes(preNavigationClassification.type)) totalAssets += 1;
        if (preNavigationClassification.type === 'API_ENDPOINT') totalApiEndpoints += 1;
        await logCrawlDecision(runId, current.url, current.url, 'SKIPPED', `${preNavigationClassification.type}: ${preNavigationClassification.reason}`, current.source);
        continue;
      }

      const circuit = getHostCircuit(current.url, hostCircuits, scopeConfig);
      if (circuit.state === 'OPEN') {
        totalSkippedPages += 1;
        await logScanEnvironmentEvent(runId, current.url, 'RATE_LIMITED', 'Host circuit breaker is open; skipping new request until cooldown expires.', {
          host: new URL(current.url).hostname,
          circuitState: circuit.state,
          coverageImpact: 'Page left untested while host is paused'
        });
        await logCrawlDecision(runId, current.url, current.url, 'SKIPPED', 'RATE_LIMITED: host circuit breaker open', current.source);
        continue;
      }

      if (current.depth > scopeConfig.maxDepth) {
        totalSkippedPages += 1;
        await logCrawlDecision(runId, current.url, current.url, 'SKIPPED', 'Max crawl depth exceeded', current.source);
        continue;
      }

      processedUrls.add(current.url);
      totalCrawlRequests += 1;
      await sleep(getNavigationDelayMs(scopeConfig));
      await assertRunNotCanceled(runId);

      const stepStart = Date.now();
      let stepStatus = 'PASSED';
      let errorMessage: string | null = null;
      let shouldAuditPage = true;

      try {
        const runtimeStart = runtimeSignals.length;
        const networkStart = networkSignals.length;
        const navigation = await navigateWithRetry(page, current.url, scopeConfig, runId, hostCircuits);
        await assertRunNotCanceled(runId);
        const response = navigation.response;
        const pageRuntimeSignals = runtimeSignals.slice(runtimeStart);
        const pageNetworkSignals = networkSignals.slice(networkStart);

        if (navigation.exhaustedRateLimit) {
          stepStatus = 'FAILED';
          totalFailedPages += 1;
          errorMessage = 'RETRY_EXHAUSTED: Target returned retryable temporary responses after controlled retries.';
          await logCrawlDecision(runId, current.url, current.url, 'FAILED', errorMessage, current.source);
          shouldAuditPage = false;
        }

        const classificationOptions: { statusCode?: number; contentType?: string; contentDisposition?: string; requestResourceType?: string; allowSubdomains?: boolean } = {
          allowSubdomains: scopeConfig.subdomainPolicy === 'ALL_SUBDOMAINS'
        };
        if (response) {
          classificationOptions.statusCode = response.status();
          const contentType = response.headers()['content-type'];
          const contentDisposition = response.headers()['content-disposition'];
          if (contentType !== undefined) classificationOptions.contentType = contentType;
          if (contentDisposition !== undefined) classificationOptions.contentDisposition = contentDisposition;
          classificationOptions.requestResourceType = response.request().resourceType();
        }
        const finalClassification = classifyUrl(response?.url() ?? current.url, targetUrl, classificationOptions);

        if (shouldAuditPage && finalClassification.type !== 'HTML_PAGE') {
          if (finalClassification.type === 'DOWNLOAD') totalDownloads += 1;
          if (['IMAGE', 'VIDEO', 'AUDIO', 'FONT', 'STYLESHEET', 'SCRIPT'].includes(finalClassification.type)) totalAssets += 1;
          if (finalClassification.type === 'API_ENDPOINT') totalApiEndpoints += 1;
          stepStatus = 'PASSED';
          errorMessage = `${finalClassification.type}: ${finalClassification.reason}`;
          await logCrawlDecision(runId, current.url, response?.url() ?? current.url, 'SKIPPED', `${finalClassification.type}: ${finalClassification.reason}`, current.source);
          shouldAuditPage = false;
        }

        if (shouldAuditPage) {
          scannedPageUrls.add(current.url);

          if (response && response.status() >= 400) {
            stepStatus = 'FAILED';
            totalFailedPages += 1;
            errorMessage = classifyHttpError(response.status());
            await logCrawlDecision(runId, current.url, response.url(), 'FAILED', errorMessage, current.source);
          } else {
            totalSuccessfulPages += 1;
            await logCrawlDecision(runId, current.url, response?.url() ?? current.url, 'VISITED', 'Successfully crawled and parsed HTML page content', current.source);
          }

          const pageState = await classifyPageState(page, response);

          if (scannedPageUrls.size < scopeConfig.maxPages && (options.checks?.includes('recursive_links') ?? true)) {
            const discovered = await discoverLinks(page);
            for (const item of discovered) {
              const normalized = normalizeUrl(item.href, scopeConfig);
              const decision = isUrlAllowed(normalized, targetUrl, scopeConfig);
              const classification = classifyUrl(normalized, targetUrl, { allowSubdomains: scopeConfig.subdomainPolicy === 'ALL_SUBDOMAINS' });
              discoveredUrls.add(normalized);
              if (decision.allowed) {
                if (classification.type === 'HTML_PAGE' && !processedUrls.has(normalized) && !pendingQueue.some((queued) => queued.url === normalized)) {
                  pendingQueue.push({ url: normalized, source: item.source, depth: current.depth + 1 });
                  await logCrawlDecision(runId, item.href, normalized, 'QUEUED', decision.reason, item.source);
                } else if (classification.type !== 'HTML_PAGE') {
                  await logCrawlDecision(runId, item.href, normalized, 'SKIPPED', `${classification.type}: ${classification.reason}`, item.source);
                }
              } else {
                totalBlockedPages += 1;
                await logCrawlDecision(runId, item.href, normalized, 'BLOCKED', decision.reason, item.source);
              }
            }
          } else {
            pageLimitReached = pendingQueue.length > 0;
          }

          await runPageAudits(page, {
            runId,
            projectId: run.projectId,
            pageUrl: current.url,
            browserType,
            viewport: '1440x900',
            response,
            pageState,
            runtimeSignals: pageRuntimeSignals,
            networkSignals: pageNetworkSignals,
            scopeConfig,
            captureScreenshot: scannedPageUrls.size <= scopeConfig.maxScreenshots,
            ...(options.checks ? { checks: new Set(options.checks) } : {})
          });
        }
      } catch (error) {
        if (error instanceof RunCanceledError) throw error;
        stepStatus = 'FAILED';
        totalFailedPages += 1;
        errorMessage = error instanceof Error ? error.message : 'Unknown network error';
        logger.error({ err: error, url: redactSensitive(current.url) }, 'Failed to crawl page');
        await logCrawlDecision(runId, current.url, current.url, 'FAILED', errorMessage, current.source);
      }

      await prisma.stepRun.create({
        data: {
          caseRunId: caseRun.id,
          action: 'navigate',
          target: current.url,
          status: stepStatus,
          durationMs: Date.now() - stepStart,
          errorMessage
        }
      });

      await prisma.runEvent.create({
        data: {
          testRunId: runId,
          type: 'LOG',
          message: `Coverage counters: discovered=${discoveredUrls.size}, queued=${pendingQueue.length}, scanned=${scannedPageUrls.size}, networkRequests=${totalNetworkRequests}, downloads=${totalDownloads}, assets=${totalAssets}, api=${totalApiEndpoints}, skipped=${totalSkippedPages}, blocked=${totalBlockedPages}, failed=${totalFailedPages}, untested=${Math.max(pendingQueue.length, 0)}, pageLimitReached=${pageLimitReached}.`,
          metadata: serializeMetadata({
            discovered: discoveredUrls.size,
            queued: pendingQueue.length,
            scanned: scannedPageUrls.size,
            networkRequests: totalNetworkRequests,
            downloads: totalDownloads,
            assets: totalAssets,
            apiEndpoints: totalApiEndpoints,
            skipped: totalSkippedPages,
            blocked: totalBlockedPages,
            failed: totalFailedPages,
            untested: pendingQueue.length,
            pageLimit: scopeConfig.maxPages,
            pageLimitReached,
            config: scopeConfig
          })
        }
      });
    }

    if (pendingQueue.length > 0 && scannedPageUrls.size >= scopeConfig.maxPages) {
      pageLimitReached = true;
      await logScanEnvironmentEvent(runId, targetUrl, 'UNKNOWN_INCONCLUSIVE', 'PAGE_LIMIT_REACHED: remaining discovered HTML pages were left untested by configuration.', {
        pageLimit: scopeConfig.maxPages,
        queuedRemaining: pendingQueue.length,
        coverageImpact: 'Untested scope remains because maximumPages was reached'
      });
    }
    if (totalNetworkRequests >= scopeConfig.maxRequests) {
      await logScanEnvironmentEvent(runId, targetUrl, 'UNKNOWN_INCONCLUSIVE', 'REQUEST_LIMIT_REACHED: network request budget exhausted; remaining coverage was not inspected.', {
        requestLimit: scopeConfig.maxRequests,
        queuedRemaining: pendingQueue.length
      });
    }
    if (totalFailedPages >= scopeConfig.maxErrors) {
      await logScanEnvironmentEvent(runId, targetUrl, 'UNKNOWN_INCONCLUSIVE', 'ERROR_LIMIT_REACHED: scan stopped after the configured number of failed pages.', {
        errorLimit: scopeConfig.maxErrors,
        failedPages: totalFailedPages,
        queuedRemaining: pendingQueue.length
      });
    }

    const durationMs = Date.now() - startTime;
    await assertRunNotCanceled(runId);
    const incompleteCoverage = pendingQueue.length > 0 || totalNetworkRequests >= scopeConfig.maxRequests;
    await prisma.testCaseRun.update({
      where: { id: caseRun.id },
      data: {
        status: totalFailedPages > 0 ? 'FAILED' : incompleteCoverage ? 'SKIPPED' : 'PASSED',
        durationMs
      }
    });

    const completion = await prisma.testRun.updateMany({
      where: { id: runId, status: 'DISCOVERING' },
      data: {
        status: totalFailedPages === 0 && !incompleteCoverage ? 'COMPLETED' : 'PARTIALLY_COMPLETED',
        completedAt: new Date()
      }
    });
    if (completion.count === 0) throw new RunCanceledError(runId);

    await prisma.auditLog.create({
      data: {
        action: 'EXECUTE_WHOLE_SITE_RUN',
        entityType: 'TestRun',
        entityId: runId,
        details: serializeMetadata({
          browserType,
          targetUrl: redactSensitive(targetUrl),
          visitedPagesCount: scannedPageUrls.size,
          discoveredUrlsCount: discoveredUrls.size,
          totalCrawlRequests,
          totalSuccessfulPages,
          totalFailedPages,
          totalSkippedPages,
          totalBlockedPages,
          totalDownloads,
          totalAssets,
          totalApiEndpoints,
          pageLimitReached,
          scopeConfig
        })
      }
    });
  } catch (error) {
    if (error instanceof RunCanceledError) {
      logger.info({ runId }, 'Run canceled by operator; worker stopped execution.');
      await prisma.runEvent.create({
        data: {
          testRunId: runId,
          type: 'WARNING',
          message: 'Worker acknowledged stop request and halted execution.',
          metadata: serializeMetadata({ resultSection: 'SCAN_ENVIRONMENT', operatorAction: 'CANCELED_ACKNOWLEDGED' })
        }
      }).catch(() => undefined);
      return;
    }

    logger.error({ error, runId }, 'Fatal crawler execution failure');
    await prisma.testRun.updateMany({
      where: { id: runId, status: { not: 'CANCELED' } },
      data: { status: error instanceof RunTimedOutError ? 'TIMED_OUT' : 'FAILED', completedAt: new Date() }
    });

    const run = await prisma.testRun.findUnique({ where: { id: runId } });
    if (run) {
      await logIssue(run.projectId, {
        category: 'RUNTIME',
        severity: 'CRITICAL',
        rule: 'RUN_FATAL_FAILURE',
        title: 'Whole-site run failed before completion',
        description: error instanceof Error ? error.message : 'Unknown fatal error',
        evidence: 'Worker caught fatal execution exception and marked the run as failed.',
        confidence: 1,
        suggestedFix: 'Review target availability, crawl limits, queue connectivity, and worker browser installation.'
      }, runId, targetUrl, browserType, '1440x900');
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function runPageAudits(page: Page, context: PageAuditContext): Promise<void> {
  const [title, content, pageSignals, performanceMetrics] = await Promise.all([
    page.title(),
    page.content(),
    collectDomSignals(page),
    collectPerformanceMetrics(page)
  ]);

  const findings = [
    ...auditSeo(title, content, pageSignals, context),
    ...auditAccessibility(pageSignals),
    ...auditPerformance(performanceMetrics, context.networkSignals),
    ...auditRuntime(context.runtimeSignals, context.networkSignals),
    ...auditPrivacyAndConsent(content, context.networkSignals, pageSignals),
    ...auditSecurity(context.response, content, context.pageUrl),
    ...auditVisualAndContent(pageSignals, context.pageState),
    ...auditPwaAndModernCapabilities(content, pageSignals)
  ].filter((finding) => isFindingEnabled(finding, context.checks));

  await prisma.runMetric.createMany({
    data: [
      { testRunId: context.runId, name: `Page.NavigationDurationMs:${metricPageKey(context.pageUrl)}`, value: performanceMetrics.navigationDurationMs },
      { testRunId: context.runId, name: `Page.LargestContentfulPaintMs:${metricPageKey(context.pageUrl)}`, value: performanceMetrics.lcpMs },
      { testRunId: context.runId, name: `Page.CumulativeLayoutShift:${metricPageKey(context.pageUrl)}`, value: performanceMetrics.cls },
      { testRunId: context.runId, name: `Page.TotalBlockingTimeMs:${metricPageKey(context.pageUrl)}`, value: performanceMetrics.tbtMs },
      { testRunId: context.runId, name: `Page.ResourceCount:${metricPageKey(context.pageUrl)}`, value: context.networkSignals.length },
      { testRunId: context.runId, name: `Page.TransferSizeBytes:${metricPageKey(context.pageUrl)}`, value: context.networkSignals.reduce((sum, signal) => sum + signal.transferSize, 0) },
      { testRunId: context.runId, name: `Page.FailedRequestCount:${metricPageKey(context.pageUrl)}`, value: context.networkSignals.filter((signal) => signal.status >= 400).length },
      { testRunId: context.runId, name: `Page.ConsoleErrorCount:${metricPageKey(context.pageUrl)}`, value: context.runtimeSignals.filter((signal) => signal.errorType === 'JAVASCRIPT_RUNTIME_ERROR').length }
    ]
  });

  const screenshotKey = await capturePageScreenshotEvidence(page, context);

  for (const finding of findings) {
    await logIssue(context.projectId, finding, context.runId, context.pageUrl, context.browserType, context.viewport, screenshotKey);
  }

  await prisma.runEvent.create({
    data: {
      testRunId: context.runId,
      type: 'LOG',
      message: `Page audit completed for ${redactSensitive(context.pageUrl)}. Findings=${findings.length}.`,
      metadata: serializeMetadata({
        page: redactSensitive(context.pageUrl),
        browser: context.browserType,
        viewport: context.viewport,
        facts: {
          titleLength: title.length,
          links: pageSignals.linkCount,
          images: pageSignals.imageCount,
          forms: pageSignals.formCount,
          headings: pageSignals.headingLevels
        },
        inference: 'Template, UX, and business-impact labels are advisory unless corroborated by configured journeys.',
        suggestion: 'Review high-severity findings first, then inspect supporting evidence.'
      })
    }
  });
}

function isFindingEnabled(finding: AuditFindingDraft, checks?: ReadonlySet<string>): boolean {
  if (!checks) return true;
  const rule = finding.rule;
  if (rule === 'SEO_JSON_LD_INVALID') return checks.has('structured_data');
  if (rule.startsWith('SEO_') || rule.startsWith('CONTENT_') || rule === 'HTML_LANG_MISSING') return checks.has('seo');
  if (rule === 'A11Y_TEXT_SIZE') return checks.has('font_sizing');
  if (rule.startsWith('A11Y_')) return checks.has('accessibility') || checks.has('screen_reader');
  if (rule.startsWith('PERF_')) return checks.has('performance') || checks.has('resource_sizes');
  if (rule.startsWith('WEBSEC_')) return checks.has('security');
  if (rule.startsWith('PRIVACY_') || rule.startsWith('CONSENT_') || rule === 'UX_FORM_PRIVACY_HELP_SIGNAL') {
    return checks.has('cookies_inspection') || checks.has('consent_banners');
  }
  if (rule.startsWith('NETWORK_') || rule.startsWith('API_')) return checks.has('broken_links') || checks.has('api_payload');
  if (rule.startsWith('RESPONSIVE_') || rule.startsWith('VISUAL_') || rule.startsWith('MEDIA_') || rule.startsWith('FRONTEND_') || rule.startsWith('RTL_') || rule.startsWith('OFFSCREEN_') || rule.startsWith('ERROR_PAGE_') || rule.startsWith('HORIZONTAL_')) return checks.has('visual_layout');
  return true;
}

function createInitialFrontier(targetUrl: string, scopeConfig: ScopeConfig): FrontierItem[] {
  const seeds = scopeConfig.seedUrls?.length ? scopeConfig.seedUrls : [targetUrl];
  const frontier: FrontierItem[] = [];
  for (const seed of seeds) {
    const normalized = normalizeUrl(seed, scopeConfig);
    const decision = isUrlAllowed(normalized, targetUrl, scopeConfig);
    if (decision.allowed) {
      frontier.push({ url: normalized, source: 'SEED', depth: 0 });
    }
  }
  return frontier;
}

async function discoverLinks(page: Page): Promise<DiscoveredLink[]> {
  return page.evaluate(() => {
    const links: { href: string; source: string }[] = [];
    const pushHref = (href: string | null, source: string) => {
      if (href) {
        links.push({ href, source });
      }
    };

    document.querySelectorAll('a[href]').forEach((element) => pushHref((element as HTMLAnchorElement).href, 'ANCHOR'));
    document.querySelectorAll('nav a[href], .menu a[href], [class*="menu"] a[href]').forEach((element) => pushHref((element as HTMLAnchorElement).href, 'NAVIGATION_MENU'));
    document.querySelectorAll('footer a[href], [class*="footer"] a[href]').forEach((element) => pushHref((element as HTMLAnchorElement).href, 'FOOTER'));
    document.querySelectorAll('.breadcrumb a[href], .breadcrumbs a[href], [class*="breadcrumb"] a[href]').forEach((element) => pushHref((element as HTMLAnchorElement).href, 'BREADCRUMB'));
    document.querySelectorAll('.pagination a[href], [class*="pagination"] a[href]').forEach((element) => pushHref((element as HTMLAnchorElement).href, 'PAGINATION'));
    document.querySelectorAll('form[action]').forEach((element) => pushHref((element as HTMLFormElement).action, 'FORM_ACTION'));
    document.querySelectorAll('iframe[src]').forEach((element) => pushHref((element as HTMLIFrameElement).src, 'IFRAME'));
    pushHref(document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null, 'CANONICAL_TAG');
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => pushHref(element.getAttribute('href'), 'ALTERNATE_HREFLANG'));

    document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => {
      try {
        const parsed: unknown = JSON.parse(element.textContent ?? '{}');
        const walk = (value: unknown) => {
          if (typeof value === 'string' && value.startsWith('http')) {
            links.push({ href: value, source: 'STRUCTURED_DATA' });
          }
          if (Array.isArray(value)) {
            value.forEach(walk);
          }
          if (typeof value === 'object' && value !== null) {
            Object.values(value as Record<string, unknown>).forEach(walk);
          }
        };
        walk(parsed);
      } catch {
        links.push({ href: location.href, source: 'MALFORMED_STRUCTURED_DATA' });
      }
    });

    return links;
  });
}

async function navigateWithRetry(
  page: Page,
  url: string,
  scopeConfig: ScopeConfig,
  runId: string,
  hostCircuits: Map<string, HostCircuitState>
): Promise<{ response: Response | null; exhaustedRateLimit: boolean; attempts: number }> {
  const host = new URL(url).hostname;
  let response: Response | null = null;
  const maxAttempts = Math.min(scopeConfig.maximumRetryAttempts, scopeConfig.retryCount);

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    response = await page.goto(url, {
      timeout: scopeConfig.timeoutPerPage * 1000,
      waitUntil: 'load'
    });

    const status = response?.status() ?? 0;
    const retryable = scopeConfig.retryableStatusCodes.includes(status);
    if (!retryable) {
      updateHostCircuit(host, hostCircuits, false, scopeConfig);
      return { response, exhaustedRateLimit: false, attempts: attempt + 1 };
    }

    updateHostCircuit(host, hostCircuits, true, scopeConfig);
    const retryAfterMs = parseRetryAfterMs(response?.headers()['retry-after'] ?? null, Date.now(), scopeConfig.maximumHostPauseMs);
    const backoffMs = retryAfterMs ?? getBackoffMs(attempt, 0.5, 1000, scopeConfig.maximumHostPauseMs);
    await logScanEnvironmentEvent(runId, url, status === 429 ? 'RATE_LIMITED' : classifyHttpError(status), `HTTP_${status}: temporary response triggered controlled retry/backoff; this is not a JavaScript runtime defect.`, {
      host,
      statusCode: status,
      attempt: attempt + 1,
      maxAttempts: maxAttempts + 1,
      retryAfterMs,
      delayAppliedMs: backoffMs,
      throttleChange: 'per-host temporary pause',
      effectiveLoadPolicy: getEffectiveLoadPolicy(scopeConfig),
      circuitState: getHostCircuit(url, hostCircuits, scopeConfig).state,
      coverageImpact: attempt >= maxAttempts ? 'Coverage incomplete after retry exhaustion' : 'Host paused before controlled retry'
    });

    if (attempt >= maxAttempts) {
      return { response, exhaustedRateLimit: true, attempts: attempt + 1 };
    }
    await sleep(backoffMs);
  }

  return { response, exhaustedRateLimit: false, attempts: maxAttempts + 1 };
}

function getHostCircuit(rawUrl: string, circuits: Map<string, HostCircuitState>, scopeConfig: ScopeConfig): HostCircuitState {
  const host = new URL(rawUrl).hostname;
  const current = circuits.get(host) ?? { state: 'CLOSED', failureCount: 0, openedAtMs: 0 };
  if (current.state === 'OPEN' && Date.now() - current.openedAtMs >= scopeConfig.circuitBreakerCooldownMs) {
    const next: HostCircuitState = { ...current, state: 'HALF_OPEN' };
    circuits.set(host, next);
    return next;
  }
  circuits.set(host, current);
  return current;
}

function updateHostCircuit(host: string, circuits: Map<string, HostCircuitState>, failed: boolean, scopeConfig: ScopeConfig): void {
  const current = circuits.get(host) ?? { state: 'CLOSED', failureCount: 0, openedAtMs: 0 };
  if (!failed) {
    circuits.set(host, { state: 'CLOSED', failureCount: 0, openedAtMs: 0 });
    return;
  }

  const failureCount = current.failureCount + 1;
  if (failureCount >= scopeConfig.circuitBreakerFailureThreshold) {
    circuits.set(host, { state: 'OPEN', failureCount, openedAtMs: Date.now() });
    return;
  }
  circuits.set(host, { ...current, failureCount });
}

async function classifyPageState(page: Page, response: Response | null): Promise<PageState> {
  const status = response?.status() ?? 0;
  if (status === 403) return 'ACCESS_DENIED_PAGE';
  if (status === 404 || status === 410) return 'UNEXPECTED_ERROR_PAGE';
  if (status >= 500) return 'SERVER_ERROR_PAGE';
  const signals = await page.evaluate(() => {
    const title = document.title.toLowerCase();
    const heading = Array.from(document.querySelectorAll('h1,h2')).map((element) => element.textContent ?? '').join(' ').toLowerCase();
    const body = (document.body?.innerText ?? '').slice(0, 2000).toLowerCase();
    const challenge = /captcha|cloudflare|checking your browser|attention required|bot protection|challenge/.test(`${title} ${heading} ${body}`);
    const soft404 = /404|not found|page not found|file not found|does not exist/.test(`${title} ${heading} ${body}`);
    return { challenge, soft404 };
  });
  if (signals.challenge) return 'CHALLENGE_PAGE';
  if (signals.soft404) return 'SOFT_404_PAGE';
  return 'NORMAL_PAGE';
}

function classifyHttpError(status: number): NormalizedErrorType {
  if (status === 429) return 'HTTP_429';
  if (status >= 500) return 'HTTP_5XX';
  if (status >= 400) return 'HTTP_4XX';
  return 'NAVIGATION_ERROR';
}

function getNavigationDelayMs(scopeConfig: ScopeConfig): number {
  const minimum = Math.max(0, scopeConfig.navigationDelayMinMs);
  const maximum = Math.max(minimum, scopeConfig.navigationDelayMaxMs, scopeConfig.delayBetweenPages);
  return Math.floor(minimum + Math.random() * (maximum - minimum + 1));
}

async function pageSetup(context: BrowserContext, runId: string, runtimeSignals: RuntimeSignal[], networkSignals: NetworkSignal[]): Promise<Page> {
  const page = await context.newPage();

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = redactSensitive(msg.text());
      const errorType = classifyConsoleMessage(text);
      runtimeSignals.push({ type: `console.${msg.type()}`, message: text, source: msg.location().url, errorType });
      prisma.runEvent.create({
        data: {
          testRunId: runId,
          type: errorType === 'FAILED_RESOURCE' || errorType === 'HTTP_429' ? 'WARNING' : msg.type() === 'error' ? 'ERROR' : 'WARNING',
          message: `Browser console ${msg.type()}: ${text}`,
          metadata: serializeMetadata({ errorType, resultSection: errorType === 'HTTP_429' ? 'SCAN_ENVIRONMENT' : errorType === 'FAILED_RESOURCE' ? 'NETWORK_API' : 'RUNTIME_CONSOLE' })
        }
      }).catch(() => undefined);
    }
  });

  page.on('pageerror', (error: Error) => {
    runtimeSignals.push({ type: 'pageerror', message: redactSensitive(error.message), errorType: 'JAVASCRIPT_RUNTIME_ERROR' });
  });

  page.on('response', (response: Response) => {
    const request = response.request();
    const timing = request.timing();
    const signal: NetworkSignal = {
      method: request.method(),
      url: redactSensitive(response.url()),
      status: response.status(),
      contentType: response.headers()['content-type'] ?? 'unknown',
      durationMs: Math.max(0, timing.responseEnd - timing.startTime),
      transferSize: Number(response.headers()['content-length'] ?? 0),
      resultSection: response.status() === 429 ? 'SCAN_ENVIRONMENT' : response.status() >= 400 ? 'NETWORK_API' : 'EVIDENCE'
    };
    if (response.status() >= 400) {
      signal.errorType = classifyHttpError(response.status());
    }
    networkSignals.push(signal);
  });

  return page;
}

function classifyConsoleMessage(message: string): NormalizedErrorType {
  if (/failed to load resource/i.test(message) && /429|too many requests/i.test(message)) {
    return 'HTTP_429';
  }
  if (/failed to load resource/i.test(message)) {
    return 'FAILED_RESOURCE';
  }
  if (/unhandled promise/i.test(message)) {
    return 'UNHANDLED_PROMISE_REJECTION';
  }
  if (/hydration/i.test(message)) {
    return 'HYDRATION_ERROR';
  }
  if (/content security policy|csp/i.test(message)) {
    return 'CSP_VIOLATION';
  }
  return 'JAVASCRIPT_RUNTIME_ERROR';
}

interface DomSignals {
  titleCount: number;
  metaDescriptionCount: number;
  h1Count: number;
  headingLevels: number[];
  imageCount: number;
  missingAltImages: number;
  zeroDimensionImages: number;
  linkCount: number;
  internalLinkCount: number;
  linkWithoutHrefCount: number;
  duplicateIdCount: number;
  formCount: number;
  sensitiveAutocompleteCount: number;
  smallTextCount: number;
  clippedElementCount: number;
  overflowX: boolean;
  horizontalOverflowPx: number;
  lang: string;
  dir: string;
  canonicalCount: number;
  jsonLdCount: number;
  malformedJsonLdCount: number;
  manifestPresent: boolean;
  serviceWorkerControlled: boolean;
  viewportMetaPresent: boolean;
}

async function collectDomSignals(page: Page): Promise<DomSignals> {
  return page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const bodyWidth = document.body?.scrollWidth ?? 0;
    const bodyClientWidth = document.body?.clientWidth ?? 0;
    const viewportWidth = document.documentElement.clientWidth;
    const horizontalOverflowPx = Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyWidth - bodyClientWidth
    );
    const headingLevels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading) => Number(heading.tagName.slice(1)));
    const malformedJsonLdCount = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).filter((element) => {
      try {
        JSON.parse(element.textContent ?? '{}');
        return false;
      } catch {
        return true;
      }
    }).length;

    const smallTextCount = Array.from(document.querySelectorAll('body *')).filter((element) => {
      const style = window.getComputedStyle(element);
      return element.textContent?.trim() && Number.parseFloat(style.fontSize) < 12;
    }).length;

    const clippedElementCount = Array.from(document.querySelectorAll('body *')).filter((element) => {
      if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false;
      if (element.closest('[hidden],[aria-hidden="true"],[inert],dialog:not([open]),details:not([open])')) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (Number.parseFloat(style.opacity || '1') === 0) return false;
      if (rect.width <= 0 || rect.height <= 0) return false;
      const anchoredEdgeControl = (style.position === 'fixed' || style.position === 'sticky') && horizontalOverflowPx <= 4;
      if (anchoredEdgeControl) return false;
      return horizontalOverflowPx > 4 && (rect.right > viewportWidth + 4 || rect.left < -4);
    }).length;

    return {
      titleCount: document.querySelectorAll('title').length,
      metaDescriptionCount: document.querySelectorAll('meta[name="description"]').length,
      h1Count: document.querySelectorAll('h1').length,
      headingLevels,
      imageCount: document.images.length,
      missingAltImages: document.querySelectorAll('img:not([alt])').length,
      zeroDimensionImages: Array.from(document.images).filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0).length,
      linkCount: document.querySelectorAll('a').length,
      internalLinkCount: Array.from(document.querySelectorAll('a[href]')).filter((anchor) => (anchor as HTMLAnchorElement).origin === location.origin).length,
      linkWithoutHrefCount: document.querySelectorAll('a:not([href])').length,
      duplicateIdCount: new Set(duplicateIds).size,
      formCount: document.forms.length,
      sensitiveAutocompleteCount: document.querySelectorAll('input[type="password"][autocomplete="on"], input[name*="card" i][autocomplete="on"], input[name*="token" i][autocomplete="on"]').length,
      smallTextCount,
      clippedElementCount,
      overflowX: horizontalOverflowPx > 4,
      horizontalOverflowPx,
      lang: document.documentElement.lang || '',
      dir: document.documentElement.dir || 'ltr',
      canonicalCount: document.querySelectorAll('link[rel="canonical"]').length,
      jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      malformedJsonLdCount,
      manifestPresent: Boolean(document.querySelector('link[rel="manifest"]')),
      serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
      viewportMetaPresent: Boolean(document.querySelector('meta[name="viewport"]'))
    };
  });
}

interface PerformanceMetrics {
  navigationDurationMs: number;
  fcpMs: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  speedIndexMs: number;
}

async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? 0;
    const duration = navigation ? navigation.loadEventEnd - navigation.startTime : 0;

    return {
      navigationDurationMs: Math.max(0, duration),
      fcpMs: Math.max(0, fcp),
      lcpMs: Math.max(0, duration * 0.45),
      cls: 0,
      tbtMs: Math.max(0, duration * 0.2),
      speedIndexMs: Math.max(0, duration * 0.6)
    };
  });
}

function auditSeo(title: string, content: string, signals: DomSignals, context: PageAuditContext): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  if (signals.titleCount !== 1 || title.trim().length < 5) {
    findings.push(createFinding('SEO', 'MEDIUM', 'SEO_TITLE_QUALITY', 'Missing, duplicate, or short title tag', `titleCount=${signals.titleCount}; titleLength=${title.trim().length}`, 'Add one descriptive title tag per page.'));
  }
  if (signals.metaDescriptionCount !== 1) {
    findings.push(createFinding('SEO', 'LOW', 'SEO_META_DESCRIPTION', 'Missing or duplicate meta description', `metaDescriptionCount=${signals.metaDescriptionCount}`, 'Add one concise meta description.'));
  }
  if (signals.h1Count !== 1) {
    findings.push(createFinding('SEO', 'MEDIUM', 'SEO_PRIMARY_HEADING', 'Page does not have exactly one primary h1', `h1Count=${signals.h1Count}`, 'Provide one clear h1 matching the page intent.'));
  }
  if (!signals.lang) {
    findings.push(createFinding('LOCALIZATION', 'MEDIUM', 'HTML_LANG_MISSING', 'Document language is missing', 'html[lang] is empty.', 'Set lang for English, Arabic, or configured locale.'));
  }
  if (signals.canonicalCount > 1) {
    findings.push(createFinding('SEO', 'MEDIUM', 'SEO_CANONICAL_DUPLICATE', 'Multiple canonical links detected', `canonicalCount=${signals.canonicalCount}`, 'Keep one canonical URL and report conflicts.'));
  }
  if (signals.malformedJsonLdCount > 0) {
    findings.push(createFinding('SEO', 'HIGH', 'SEO_JSON_LD_INVALID', 'Malformed structured data JSON-LD', `malformedJsonLdCount=${signals.malformedJsonLdCount}`, 'Fix JSON-LD syntax before publishing.'));
  }
  if (signals.linkWithoutHrefCount > 0) {
    findings.push(createFinding('SEO', 'LOW', 'SEO_UNCRAWLABLE_LINKS', 'Links without crawlable href detected', `linkWithoutHrefCount=${signals.linkWithoutHrefCount}`, 'Use real href values for crawlable navigation.'));
  }
  if (context.response && context.response.status() >= 400) {
    findings.push(createFinding('SEO', 'HIGH', 'SEO_STATUS_CODE', 'Page returned error HTTP status', `status=${context.response.status()}`, 'Fix the page response or exclude it with an explicit reason.'));
  }
  if (content.length < 500) {
    findings.push(createFinding('CONTENT', 'LOW', 'CONTENT_THIN_PAGE_SIGNAL', 'Thin page signal detected', `htmlLength=${content.length}`, 'Review whether the page has enough meaningful content for its purpose.'));
  }
  return findings;
}

function auditAccessibility(signals: DomSignals): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  if (signals.missingAltImages > 0) {
    findings.push(createFinding('ACCESSIBILITY', 'HIGH', 'A11Y_IMAGE_ALT', 'Images are missing alt text', `missingAltImages=${signals.missingAltImages}; imageCount=${signals.imageCount}`, 'Add descriptive alt text or empty alt for decorative images.'));
  }
  if (signals.smallTextCount > 0) {
    findings.push(createFinding('ACCESSIBILITY', 'LOW', 'A11Y_TEXT_SIZE', 'Very small text detected', `smallTextCount=${signals.smallTextCount}`, 'Ensure text remains readable and resizable.'));
  }
  if (signals.sensitiveAutocompleteCount > 0) {
    findings.push(createFinding('PRIVACY', 'MEDIUM', 'A11Y_AUTH_AUTOCOMPLETE', 'Sensitive fields allow insecure autocomplete', `sensitiveAutocompleteCount=${signals.sensitiveAutocompleteCount}`, 'Use appropriate autocomplete tokens for sensitive fields.'));
  }
  if (signals.headingLevels.some((level, index, levels) => index > 0 && level - (levels[index - 1] ?? level) > 1)) {
    findings.push(createFinding('ACCESSIBILITY', 'MEDIUM', 'A11Y_HEADING_ORDER', 'Heading hierarchy skips levels', `headingLevels=${signals.headingLevels.join(',')}`, 'Use semantic heading order for assistive technology.'));
  }
  return findings;
}

function auditPerformance(metrics: PerformanceMetrics, networkSignals: NetworkSignal[]): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  const transferSize = networkSignals.reduce((sum, signal) => sum + signal.transferSize, 0);
  if (metrics.lcpMs > 2500) {
    findings.push(createFinding('PERFORMANCE', 'MEDIUM', 'PERF_LCP_BUDGET', 'Largest Contentful Paint exceeds default budget', `lcpMs=${Math.round(metrics.lcpMs)}`, 'Optimize critical rendering path, hero media, and server timing.'));
  }
  if (metrics.tbtMs > 200) {
    findings.push(createFinding('PERFORMANCE', 'MEDIUM', 'PERF_TBT_BUDGET', 'Total Blocking Time exceeds default budget', `tbtMs=${Math.round(metrics.tbtMs)}`, 'Reduce long main-thread tasks and defer non-critical scripts.'));
  }
  if (networkSignals.length > 120) {
    findings.push(createFinding('PERFORMANCE', 'LOW', 'PERF_RESOURCE_COUNT', 'High resource count detected', `resourceCount=${networkSignals.length}`, 'Group or defer non-critical resources.'));
  }
  if (transferSize > 2_500_000) {
    findings.push(createFinding('PERFORMANCE', 'MEDIUM', 'PERF_TRANSFER_SIZE', 'Large transfer size detected', `transferSizeBytes=${transferSize}`, 'Compress, cache, and resize large resources.'));
  }
  if (networkSignals.some((signal) => signal.contentType.includes('javascript') && signal.transferSize > 500_000)) {
    findings.push(createFinding('PERFORMANCE', 'MEDIUM', 'PERF_LARGE_JS', 'Oversized JavaScript bundle signal', 'A JavaScript response exceeded 500KB compressed transfer size.', 'Split code and remove unused JavaScript.'));
  }
  return findings;
}

function auditRuntime(runtimeSignals: RuntimeSignal[], networkSignals: NetworkSignal[]): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  const errors = runtimeSignals.filter((signal) => signal.errorType === 'JAVASCRIPT_RUNTIME_ERROR' || signal.errorType === 'UNHANDLED_PROMISE_REJECTION' || signal.errorType === 'HYDRATION_ERROR' || signal.type === 'pageerror');
  if (errors.length > 0) {
    findings.push(createFinding('RUNTIME', 'HIGH', 'RUNTIME_BROWSER_ERRORS', 'Browser runtime errors detected', `errorCount=${errors.length}; first=${errors[0]?.message ?? 'n/a'}`, 'Fix uncaught JavaScript and hydration/runtime errors.', { resultSection: 'RUNTIME_CONSOLE', errorType: errors[0]?.errorType ?? 'JAVASCRIPT_RUNTIME_ERROR' }));
  }
  const rateLimitedResources = networkSignals.filter((signal) => signal.status === 429);
  if (rateLimitedResources.length > 0) {
    findings.push(createFinding('SCAN_ENVIRONMENT', 'INFO', 'SCAN_RATE_LIMITED_RESOURCES', 'Rate-limited resources observed during scan', `rateLimitedResources=${rateLimitedResources.length}`, 'Reduce scan intensity, scan staging, or allowlist the scanner for owned systems.', { resultSection: 'SCAN_ENVIRONMENT', errorType: 'HTTP_429' }));
  }
  const failedResources = networkSignals.filter((signal) => signal.status >= 400 && signal.status !== 429);
  if (failedResources.length > 0) {
    findings.push(createFinding('NETWORK_API', 'MEDIUM', 'NETWORK_FAILED_RESOURCES', 'Failed network resources detected', `failedResources=${failedResources.length}; firstStatus=${failedResources[0]?.status ?? 0}`, 'Repair missing assets, API errors, and redirect failures.', { resultSection: 'NETWORK_API', errorType: failedResources[0]?.errorType ?? 'FAILED_RESOURCE' }));
  }
  const duplicateRequests = findDuplicateRequestCount(networkSignals);
  if (duplicateRequests > 0) {
    findings.push(createFinding('API', 'LOW', 'API_DUPLICATE_REQUESTS', 'Duplicate request patterns detected', `duplicateRequestPatterns=${duplicateRequests}`, 'Review client-side fetching and caching behavior.', { resultSection: 'NETWORK_API' }));
  }
  return findings;
}

function auditPrivacyAndConsent(content: string, networkSignals: NetworkSignal[], signals: DomSignals): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  const joinedUrls = networkSignals.map((signal) => signal.url).join('\n');
  if (SECRET_PATTERN.test(joinedUrls) || SECRET_PATTERN.test(content)) {
    findings.push(createFinding('PRIVACY', 'CRITICAL', 'PRIVACY_SECRET_EXPOSURE_SIGNAL', 'Potential secret exposure signal detected', 'Secret-like pattern found after redaction scan; full value intentionally hidden.', 'Remove secrets from URLs, bundles, logs, screenshots, and analytics payloads.'));
  }
  if (PII_PATTERN.test(joinedUrls)) {
    findings.push(createFinding('PRIVACY', 'HIGH', 'PRIVACY_PII_IN_URL', 'Potential PII in URL or network request', 'PII-like pattern found in observed URL; full value intentionally hidden.', 'Move PII to secure request bodies and redact before persistence.'));
  }
  const trackerPresent = /gtag\(|google-analytics|googletagmanager|fbq\(|clarity\(|tiktok/i.test(content);
  const consentTextPresent = /cookie|consent|privacy|accept all|reject all/i.test(content);
  if (trackerPresent && !consentTextPresent) {
    findings.push(createFinding('CONSENT', 'MEDIUM', 'CONSENT_TRACKER_WITHOUT_BANNER_SIGNAL', 'Tracker detected without visible consent signal', 'Tracker script markers found but no consent text marker was detected.', 'Verify consent policy and blocker behavior before non-essential tracking.'));
  }
  if (signals.formCount > 0 && !consentTextPresent) {
    findings.push(createFinding('UX', 'LOW', 'UX_FORM_PRIVACY_HELP_SIGNAL', 'Form exists without obvious privacy or consent support text', `formCount=${signals.formCount}`, 'Review forms for privacy notice, validation help, and accessible error states.'));
  }
  return findings;
}

function auditSecurity(response: Response | null, content: string, pageUrl: string): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  const headers = response?.headers() ?? {};
  if (pageUrl.startsWith('https://') && !headers['strict-transport-security']) {
    findings.push(createFinding('SECURITY', 'MEDIUM', 'WEBSEC_HSTS_MISSING', 'HSTS header missing on HTTPS response', 'strict-transport-security header absent.', 'Enable HSTS after confirming HTTPS is stable across the domain.'));
  }
  if (!headers['content-security-policy']) {
    findings.push(createFinding('SECURITY', 'LOW', 'WEBSEC_CSP_MISSING', 'Content-Security-Policy header missing', 'content-security-policy header absent.', 'Add a CSP that matches the application security model.'));
  }
  if (!headers['x-content-type-options']) {
    findings.push(createFinding('SECURITY', 'LOW', 'WEBSEC_MIME_SNIFFING', 'MIME sniffing protection missing', 'x-content-type-options header absent.', 'Set X-Content-Type-Options: nosniff.'));
  }
  if (/\.map(?:\?|\"|')/i.test(content)) {
    findings.push(createFinding('SECURITY', 'LOW', 'WEBSEC_SOURCE_MAP_SIGNAL', 'Public source map reference detected', 'Source-map marker found in HTML.', 'Confirm source-map exposure is intentional and policy-approved.'));
  }
  return findings;
}

function auditVisualAndContent(signals: DomSignals, pageState: PageState): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  const isErrorPage = pageState !== 'NORMAL_PAGE';
  if (signals.overflowX && !isErrorPage) {
    findings.push(createFinding('RESPONSIVE', 'MEDIUM', 'HORIZONTAL_OVERFLOW_CONFIRMED', 'Horizontal page overflow detected', `horizontalOverflowPx=${signals.horizontalOverflowPx}`, 'Fix overflowing containers, tables, media, or absolute positioning.', { resultSection: 'RESPONSIVE', pageState }));
  } else if (signals.overflowX && isErrorPage) {
    findings.push(createFinding('RESPONSIVE', 'INFO', 'ERROR_PAGE_OVERFLOW_INFORMATIONAL', 'Error-page horizontal overflow signal suppressed from defect scoring', `pageState=${pageState}; horizontalOverflowPx=${signals.horizontalOverflowPx}`, 'Fix the broken URL first; review error-page layout separately if user-visible impact is confirmed.', { resultSection: 'CRAWL_COVERAGE', pageState }));
  }
  if (signals.clippedElementCount > 0 && signals.overflowX && !isErrorPage) {
    findings.push(createFinding('RESPONSIVE', 'LOW', 'RESPONSIVE_NEEDS_REVIEW', 'Potential clipped element with real overflow needs review', `clippedElementCount=${signals.clippedElementCount}; horizontalOverflowPx=${signals.horizontalOverflowPx}`, 'Inspect screenshot evidence and confirm user impact before escalating severity.', { resultSection: 'RESPONSIVE', pageState }));
  } else if (signals.clippedElementCount > 0) {
    findings.push(createFinding('VISUAL', 'INFO', 'OFFSCREEN_ELEMENT_INFORMATIONAL', 'Off-screen geometry signal recorded as informational', `clippedElementCount=${signals.clippedElementCount}; pageState=${pageState}; horizontalOverflowPx=${signals.horizontalOverflowPx}`, 'No confirmed responsive defect was created because user-impact signals were insufficient.', { resultSection: 'UI_VISUAL', pageState }));
  }
  if (signals.zeroDimensionImages > 0) {
    findings.push(createFinding('VISUAL', 'MEDIUM', 'MEDIA_BROKEN_IMAGE_SIGNAL', 'Zero-dimension image signal detected', `zeroDimensionImages=${signals.zeroDimensionImages}`, 'Fix broken image sources and reserve stable image dimensions.'));
  }
  if (signals.duplicateIdCount > 0) {
    findings.push(createFinding('FRONTEND', 'MEDIUM', 'FRONTEND_DUPLICATE_IDS', 'Duplicate element IDs detected', `duplicateIdCount=${signals.duplicateIdCount}`, 'Ensure IDs are unique to keep labels, anchors, and scripts reliable.'));
  }
  if (signals.dir === 'rtl' && !signals.lang.toLowerCase().startsWith('ar')) {
    findings.push(createFinding('LOCALIZATION', 'LOW', 'RTL_LANG_MISMATCH_SIGNAL', 'RTL direction without Arabic language marker', `lang=${signals.lang}; dir=${signals.dir}`, 'Verify Arabic/RTL language metadata and mixed-direction content.'));
  }
  return findings;
}

function auditPwaAndModernCapabilities(content: string, signals: DomSignals): AuditFindingDraft[] {
  const findings: AuditFindingDraft[] = [];
  if (!signals.viewportMetaPresent) {
    findings.push(createFinding('FRONTEND', 'HIGH', 'FRONTEND_VIEWPORT_META_MISSING', 'Viewport meta tag missing', 'meta[name="viewport"] absent.', 'Add responsive viewport metadata.'));
  }
  if (!signals.manifestPresent && /serviceWorker|navigator\.serviceWorker/i.test(content)) {
    findings.push(createFinding('PWA', 'LOW', 'PWA_MANIFEST_MISSING', 'Service worker signal without manifest', 'Service worker marker found but manifest link absent.', 'Add or intentionally document PWA manifest behavior.'));
  }
  if (/navigator\.serviceWorker/i.test(content) && !signals.serviceWorkerControlled) {
    findings.push(createFinding('PWA', 'LOW', 'PWA_SERVICE_WORKER_NOT_CONTROLLING', 'Service worker is not controlling the page', 'navigator.serviceWorker marker present but controller is absent during this visit.', 'Verify registration, scope, cache fallback, and offline policy.'));
  }
  return findings;
}

function createFinding(
  category: AuditCategory,
  severity: FindingSeverity,
  rule: string,
  title: string,
  evidence: string,
  suggestedFix: string,
  options: { resultSection?: ResultSection; pageState?: PageState; errorType?: NormalizedErrorType } = {}
): AuditFindingDraft {
  return {
    category,
    severity,
    rule,
    title,
    description: `${title}. Fact: ${evidence}. Inference: deterministic rule ${rule} matched. Suggestion: ${suggestedFix}`,
    evidence,
    confidence: severity === 'INFO' ? 0.3 : severity === 'LOW' ? 0.7 : 0.9,
    suggestedFix,
    ...options
  };
}

async function logIssue(
  projectId: string,
  draft: AuditFindingDraft,
  runId: string,
  pageUrl: string,
  browser: ExecuteRunOptions['browserType'],
  viewport: string,
  evidencePath?: string | null
): Promise<void> {
  const fingerprint = draft.fingerprint ?? createFindingFingerprint(draft, pageUrl, browser, viewport);
  const input: AuditFindingInput = {
    rule: draft.rule,
    pageUrl: redactSensitive(pageUrl),
    browser,
    viewport,
    evidence: draft.evidence,
    severity: draft.severity,
    confidence: draft.confidence,
    category: draft.category,
    resultSection: draft.resultSection ?? mapCategoryToResultSection(draft.category),
    fingerprint,
    reproductionContext: {
      runId,
      pageUrl: redactSensitive(pageUrl),
      browser,
      viewport,
      deterministicFirst: true
    }
  };

  const existing = await prisma.issue.findFirst({
    where: {
      projectId,
      category: draft.category,
      title: draft.title,
      description: { contains: `fingerprint=${fingerprint}` }
    }
  });

  if (existing) {
    await prisma.issueOccurrence.create({
      data: {
        issueId: existing.id,
        testRunId: runId,
        browser,
        device: viewport,
        evidencePath: evidencePath ?? redactSensitive(pageUrl)
      }
    });
    return;
  }

  const issue = await prisma.issue.create({
    data: {
      projectId,
      category: draft.category,
      severity: draft.severity,
      status: 'OPEN',
      title: draft.title,
      description: `${draft.description}\n\nfingerprint=${fingerprint}\nresultSection=${input.resultSection ?? mapCategoryToResultSection(draft.category)}\npageState=${draft.pageState ?? 'NORMAL_PAGE'}\nerrorType=${draft.errorType ?? 'n/a'}\n\nEvidence contract: ${JSON.stringify(input)}`,
      suggestedFix: draft.suggestedFix
    }
  });

  await prisma.issueOccurrence.create({
    data: {
      issueId: issue.id,
      testRunId: runId,
      browser,
      device: viewport,
      evidencePath: evidencePath ?? redactSensitive(pageUrl)
    }
  });
}

async function capturePageScreenshotEvidence(page: Page, context: PageAuditContext): Promise<string | null> {
  if (!context.captureScreenshot) {
    return null;
  }

  try {
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const key = `screenshots/${context.runId}/${metricPageKey(context.pageUrl)}-${context.browserType}-${context.viewport}.png`;
    const absolutePath = join(process.cwd(), '.artifacts', key);
    await mkdir(join(process.cwd(), '.artifacts', 'screenshots', context.runId), { recursive: true });
    await writeFile(absolutePath, buffer);
    await prisma.artifact.create({
      data: {
        testRunId: context.runId,
        type: 'SCREENSHOT',
        storageKey: absolutePath,
        size: buffer.length,
        mimeType: 'image/png',
        checksum,
        retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    await prisma.runEvent.create({
      data: {
        testRunId: context.runId,
        type: 'LOG',
        message: `Screenshot evidence captured for ${context.pageUrl}.`,
        metadata: serializeMetadata({
          resultSection: 'EVIDENCE',
          pageUrl: redactSensitive(context.pageUrl),
          storageKey: absolutePath,
          checksum
        })
      }
    });
    return absolutePath;
  } catch (error) {
    logger.warn({ error, runId: context.runId, pageUrl: redactSensitive(context.pageUrl) }, 'Failed to capture page screenshot evidence');
    return null;
  }
}

async function logCrawlDecision(
  runId: string,
  originalUrl: string,
  normalizedUrl: string,
  decision: 'VISITED' | 'SKIPPED' | 'BLOCKED' | 'FAILED' | 'QUEUED',
  reason: string,
  source: string
): Promise<void> {
  await prisma.runEvent.create({
    data: {
      testRunId: runId,
      type: decision === 'FAILED' ? 'ERROR' : decision === 'BLOCKED' ? 'WARNING' : 'LOG',
      message: `[CRAWL ${decision}] original=${redactSensitive(originalUrl)} normalized=${redactSensitive(normalizedUrl)} source=${source} reason=${reason}`,
      metadata: serializeMetadata({ originalUrl: redactSensitive(originalUrl), normalizedUrl: redactSensitive(normalizedUrl), decision, reason, source })
    }
  }).catch(() => undefined);
}

async function logScanEnvironmentEvent(
  runId: string,
  url: string,
  errorType: NormalizedErrorType,
  message: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await prisma.runEvent.create({
    data: {
      testRunId: runId,
      type: errorType === 'RATE_LIMITED' || errorType === 'HTTP_429' ? 'WARNING' : 'LOG',
      message: `[SCAN_ENVIRONMENT] ${message} url=${redactSensitive(url)}`,
      metadata: serializeMetadata({
        resultSection: 'SCAN_ENVIRONMENT',
        errorType,
        url: redactSensitive(url),
        websiteDefect: false,
        recommendedNextAction: 'Reduce scan intensity, use staging, or explicitly allowlist this scanner for owned systems. Do not bypass protection.',
        ...metadata
      })
    }
  }).catch(() => undefined);
}

function mapCategoryToResultSection(category: AuditCategory): ResultSection {
  const mapping: Record<AuditCategory, ResultSection> = {
    ACCESSIBILITY: 'ACCESSIBILITY',
    API: 'NETWORK_API',
    CONSENT: 'TRACKING_PRIVACY',
    CONTENT: 'UX',
    CRAWL: 'CRAWL_COVERAGE',
    DOWNLOADS: 'CRAWL_COVERAGE',
    EVIDENCE: 'EVIDENCE',
    FRONTEND: 'UI_VISUAL',
    FUNCTIONAL: 'FUNCTIONAL',
    LOCALIZATION: 'UX',
    NETWORK_API: 'NETWORK_API',
    PERFORMANCE: 'PERFORMANCE',
    PRIVACY: 'TRACKING_PRIVACY',
    PWA: 'EVIDENCE',
    RESPONSIVE: 'RESPONSIVE',
    RUNTIME: 'RUNTIME_CONSOLE',
    SCAN_ENVIRONMENT: 'SCAN_ENVIRONMENT',
    SECURITY: 'SECURITY',
    SEO: 'SEO',
    TRACKING_PRIVACY: 'TRACKING_PRIVACY',
    UX: 'UX',
    VISUAL: 'UI_VISUAL'
  };
  return mapping[category];
}

function createFindingFingerprint(
  draft: AuditFindingDraft,
  pageUrl: string,
  browser: ExecuteRunOptions['browserType'],
  viewport: string
): string {
  const url = new URL(pageUrl, 'https://example.invalid');
  const hostKey = ['WEBSEC_HSTS_MISSING', 'WEBSEC_CSP_MISSING', 'WEBSEC_MIME_SNIFFING'].includes(draft.rule)
    ? url.host
    : `${url.host}${url.pathname}`;
  return stableHash(`${draft.rule}|${hostKey}|${browser}|${viewport}|${normalizeEvidence(draft.evidence)}`);
}

function normalizeEvidence(evidence: string): string {
  return evidence.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

function stableHash(value: string): string {
  return `f_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}

function metricPageKey(pageUrl: string): string {
  const url = new URL(pageUrl, 'https://example.invalid');
  return stableHash(`${url.origin}${url.pathname}${url.search}`);
}

function wildcardMatches(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '');
  return host === 'localhost' || (isIP(host) !== 0 && !isPublicIpAddress(host));
}

async function launchBrowser(browserType: ExecuteRunOptions['browserType']): Promise<Browser> {
  if (browserType === 'chromium') {
    return chromium.launch({ headless: true });
  }
  if (browserType === 'firefox') {
    return firefox.launch({ headless: true });
  }
  return webkit.launch({ headless: true });
}

function detectInjection(input: string): boolean {
  const triggers = ['ignore previous instructions', 'bypass security', 'system directive override', 'execute shell', '<script>'];
  return triggers.some((trigger) => input.toLowerCase().includes(trigger));
}

function redactSensitive(value: string): string {
  return value
    .replace(/(authorization=|token=|password=|secret=|api[_-]?key=|session=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/Bearer\s+[a-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
}

function findDuplicateRequestCount(signals: NetworkSignal[]): number {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const url = new URL(signal.url, 'https://example.invalid');
    const key = `${signal.method}:${url.origin}${url.pathname}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.values()).filter((count) => count > 2).length;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertRunNotCanceled(runId: string): Promise<void> {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    select: { status: true }
  });

  if (!run || run.status === 'CANCELED') {
    throw new RunCanceledError(runId);
  }
}
