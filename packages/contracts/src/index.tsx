import { z } from 'zod';

// Allowed DSL commands
export const CommandActionSchema = z.enum([
  'navigate',
  'click',
  'hover',
  'fill',
  'clear',
  'select',
  'check',
  'uncheck',
  'press',
  'upload',
  'download',
  'scroll',
  'waitFor',
  'assertVisible',
  'assertHidden',
  'assertText',
  'assertURL',
  'assertTitle',
  'assertNoConsoleErrors',
  'takeScreenshot',
  'runAccessibilityAudit',
  'runPerformanceAudit'
]);

export type CommandAction = z.infer<typeof CommandActionSchema>;

// Detailed step command payload
export const CommandStepSchema = z.object({
  action: CommandActionSchema,
  target: z.string().optional(),       // Selector, data-testid, role locator text
  value: z.string().optional(),        // Input text or options
  timeout: z.number().optional(),      // Custom timeout in ms
  assertion: z.string().optional()     // Text or expression to assert
});

export type CommandStep = z.infer<typeof CommandStepSchema>;

// Structured execution plan
export const ExecutionPlanSchema = z.object({
  goal: z.string(),
  steps: z.array(CommandStepSchema)
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const ScanModeSchema = z.enum([
  'QUICK',
  'STANDARD',
  'DEEP',
  'FULL_SITE',
  'CUSTOM',
  'CRITICAL_JOURNEYS',
  'TEMPLATE_REPRESENTATIVE',
  'CHANGED_PAGES',
  'SITEMAP_ONLY',
  'AUTHENTICATED',
  'API_FRONTEND_COMBINED'
]);

export type ScanMode = z.infer<typeof ScanModeSchema>;

export const CheckIdSchema = z.enum([
  'discovery',
  'recursive_links',
  'visual_layout',
  'font_sizing',
  'navigation_flows',
  'interaction_loops',
  'mobile_viewport',
  'tablet_viewport',
  'accessibility',
  'screen_reader',
  'performance',
  'resource_sizes',
  'seo',
  'structured_data',
  'security',
  'ssrf_protection',
  'cookies_inspection',
  'consent_banners',
  'broken_links',
  'spell_check',
  'api_payload',
  'schema_match',
  'full_page_trace',
  'video_recording'
]);
export type CheckId = z.infer<typeof CheckIdSchema>;

export const IMPLEMENTED_CHECK_IDS: readonly CheckId[] = [
  'discovery', 'recursive_links', 'visual_layout', 'font_sizing',
  'accessibility', 'screen_reader', 'performance', 'resource_sizes',
  'seo', 'structured_data', 'security', 'ssrf_protection',
  'cookies_inspection', 'consent_banners', 'broken_links'
];

export const ScopeConfigSchema = z.object({
  maxPages: z.number().int().min(1).max(10000).default(100),
  maxRequests: z.number().int().min(1).max(50000).default(500),
  maxDepth: z.number().int().min(1).max(100).default(5),
  maxExecutionTime: z.number().int().min(1).max(1440).default(30),
  crawlBudgetPerDomain: z.number().int().min(1).default(500),
  maxErrors: z.number().int().min(1).default(10),
  maxFileSizeDownload: z.number().int().min(1).default(50),
  maxPagesPerTemplate: z.number().int().min(1).default(10),
  maxUrlsPerPathPattern: z.number().int().min(1).default(50),
  maxQueryParamVariants: z.number().int().min(1).default(5),
  maxPaginationDepth: z.number().int().min(1).default(10),
  maxRedirectDepth: z.number().int().min(1).default(5),
  maxAssetCount: z.number().int().min(1).default(200),
  maxExternalLinks: z.number().int().min(0).default(50),
  maxScreenshots: z.number().int().min(0).default(100),
  maxVideoTraceStorage: z.number().int().min(1).default(100),
  concurrency: z.number().int().min(1).max(10).default(2),
  requestsPerSecond: z.number().int().min(1).max(100).default(10),
  delayBetweenPages: z.number().int().min(0).default(500),
  timeoutPerPage: z.number().int().min(1).default(30),
  timeoutPerAction: z.number().int().min(1).default(10),
  retryCount: z.number().int().min(0).default(3),
  perHostConcurrency: z.number().int().min(1).max(10).default(1),
  requestsPerSecondPerHost: z.number().int().min(1).max(100).default(2),
  htmlPageConcurrency: z.number().int().min(1).max(10).default(1),
  apiConcurrency: z.number().int().min(0).max(10).default(0),
  assetConcurrency: z.number().int().min(0).max(10).default(0),
  externalLinkConcurrency: z.number().int().min(0).max(5).default(0),
  navigationDelayMinMs: z.number().int().min(0).default(100),
  navigationDelayMaxMs: z.number().int().min(0).default(500),
  maximumRetryAttempts: z.number().int().min(0).max(10).default(3),
  maximumHostPauseMs: z.number().int().min(1000).default(120000),
  circuitBreakerFailureThreshold: z.number().int().min(1).default(3),
  circuitBreakerCooldownMs: z.number().int().min(1000).default(30000),
  retryableStatusCodes: z.array(z.number().int().min(100).max(599)).default([429, 503]),
  identifyScanner: z.boolean().default(true),
  scannerUserAgentProduct: z.string().min(1).max(80).default('SiteScope-Scanner'),
  scannerContact: z.string().max(160).optional(),
  stopOnCriticalError: z.boolean().default(true),
  continueOnPartialFailure: z.boolean().default(true),
  seedUrls: z.array(z.string().url()).optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  includeRegexes: z.array(z.string()).optional(),
  excludeRegexes: z.array(z.string()).optional(),
  queryParamAllowlist: z.array(z.string()).optional(),
  queryParamDenylist: z.array(z.string()).optional(),
  fragmentPolicy: z.enum(['IGNORE', 'PROCESS', 'HASH_ONLY']).default('IGNORE'),
  protocolPolicy: z.enum(['HTTPS_ONLY', 'HTTP_AND_HTTPS', 'HTTP_ONLY']).default('HTTPS_ONLY'),
  subdomainPolicy: z.enum(['STRICT', 'ALL_SUBDOMAINS', 'NONE']).default('STRICT'),
  externalDomainPolicy: z.enum(['BLOCK', 'ALLOW_IF_LINKED', 'CHECK_LINKS_ONLY']).default('BLOCK'),
  assetDomainPolicy: z.enum(['BLOCK', 'ALLOW_ALL', 'WHITELIST_ONLY']).default('BLOCK'),
  localePaths: z.array(z.string()).optional(),
  authenticatedPaths: z.array(z.string()).optional(),
  adminAreaExclusion: z.boolean().default(true),
  logoutUrlProtection: z.boolean().default(true),
  destructiveActionProtection: z.boolean().default(true)
});

export type ScopeConfig = z.infer<typeof ScopeConfigSchema>;

// Ceilings for a copy that anyone on the internet can use (APP_PUBLIC_MODE=true): every scan runs
// on its owner's machine and network, so it stays small, polite and identified.
export const PUBLIC_SCOPE_LIMITS = {
  maxPages: 10,
  maxRequests: 300,
  maxDepth: 2,
  maxExecutionTime: 5,
  crawlBudgetPerDomain: 10,
  maxErrors: 10,
  maxFileSizeDownload: 10,
  maxPagesPerTemplate: 5,
  maxAssetCount: 100,
  maxExternalLinks: 20,
  maxScreenshots: 10,
  maxVideoTraceStorage: 10,
  requestsPerSecond: 5,
  requestsPerSecondPerHost: 2,
  timeoutPerPage: 30,
  timeoutPerAction: 10,
  retryCount: 1,
  maximumRetryAttempts: 1
} as const satisfies Partial<Record<keyof ScopeConfig, number>>;

export function limitScopeForPublic(scope: ScopeConfig): ScopeConfig {
  const limited: ScopeConfig = { ...scope };
  for (const [key, ceiling] of Object.entries(PUBLIC_SCOPE_LIMITS) as [keyof typeof PUBLIC_SCOPE_LIMITS, number][]) {
    limited[key] = Math.min(scope[key], ceiling);
  }
  return {
    ...limited,
    concurrency: 1,
    perHostConcurrency: 1,
    htmlPageConcurrency: 1,
    identifyScanner: true,
    adminAreaExclusion: true,
    logoutUrlProtection: true,
    destructiveActionProtection: true
  };
}

export const UrlResourceTypeSchema = z.enum([
  'HTML_PAGE',
  'DOWNLOAD',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'FONT',
  'STYLESHEET',
  'SCRIPT',
  'API_ENDPOINT',
  'REDIRECT',
  'EXTERNAL_LINK',
  'UNSUPPORTED_RESOURCE'
]);
export type UrlResourceType = z.infer<typeof UrlResourceTypeSchema>;

export const PageStateSchema = z.enum([
  'NORMAL_PAGE',
  'EXPECTED_ERROR_PAGE',
  'UNEXPECTED_ERROR_PAGE',
  'DOWNLOAD_ERROR_PAGE',
  'ACCESS_DENIED_PAGE',
  'SERVER_ERROR_PAGE',
  'SOFT_404_PAGE',
  'CHALLENGE_PAGE'
]);
export type PageState = z.infer<typeof PageStateSchema>;

export const NormalizedErrorTypeSchema = z.enum([
  'NAVIGATION_ERROR',
  'DOWNLOAD_ERROR',
  'HTTP_4XX',
  'HTTP_5XX',
  'HTTP_429',
  'NETWORK_TIMEOUT',
  'FAILED_RESOURCE',
  'JAVASCRIPT_RUNTIME_ERROR',
  'UNHANDLED_PROMISE_REJECTION',
  'HYDRATION_ERROR',
  'CSP_VIOLATION',
  'ASSERTION_FAILURE',
  'LOCATOR_FAILURE',
  'EXTERNAL_DOMAIN_BLOCKED',
  'UNSUPPORTED_RESOURCE',
  'RATE_LIMITED',
  'ACCESS_POLICY',
  'UNKNOWN_INCONCLUSIVE'
]);
export type NormalizedErrorType = z.infer<typeof NormalizedErrorTypeSchema>;

export const ResultSectionSchema = z.enum([
  'OVERVIEW',
  'CRAWL_COVERAGE',
  'FUNCTIONAL',
  'UI_VISUAL',
  'UX',
  'RESPONSIVE',
  'ACCESSIBILITY',
  'PERFORMANCE',
  'SEO',
  'RUNTIME_CONSOLE',
  'NETWORK_API',
  'SCAN_ENVIRONMENT',
  'SECURITY',
  'TRACKING_PRIVACY',
  'EVIDENCE'
]);
export type ResultSection = z.infer<typeof ResultSectionSchema>;

export const FindingSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const IssueFeedbackStatusSchema = z.enum(['OPEN', 'RESOLVED', 'IGNORED']);
export type IssueFeedbackStatus = z.infer<typeof IssueFeedbackStatusSchema>;

export const AuditCategorySchema = z.enum([
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
  'VISUAL'
]);
export type AuditCategory = z.infer<typeof AuditCategorySchema>;

export const AuditFindingInputSchema = z.object({
  rule: z.string().min(1),
  pageUrl: z.string().url(),
  browser: z.enum(['chromium', 'firefox', 'webkit']),
  viewport: z.string().min(1),
  evidence: z.string().min(1),
  severity: FindingSeveritySchema,
  confidence: z.number().min(0).max(1),
  category: AuditCategorySchema.optional(),
  resultSection: ResultSectionSchema.optional(),
  fingerprint: z.string().min(1).optional(),
  pageState: PageStateSchema.optional(),
  errorType: NormalizedErrorTypeSchema.optional(),
  reproductionContext: z.object({
    runId: z.string().uuid(),
    pageUrl: z.string().url(),
    browser: z.enum(['chromium', 'firefox', 'webkit']),
    viewport: z.string().min(1),
    deterministicFirst: z.boolean()
  })
});
export type AuditFindingInput = z.infer<typeof AuditFindingInputSchema>;

// Job configuration for BullMQ
export const RunJobPayloadSchema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  targetUrl: z.string().url(),
  scanMode: ScanModeSchema.default('STANDARD'),
  scopeConfig: ScopeConfigSchema.optional(),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])),
  checks: z.array(CheckIdSchema),        // Selected checkbox IDs
  credentials: z.array(z.object({
    type: z.string(),
    key: z.string(),
    value: z.string()                 // Decrypted inside worker
  })).optional()
});

export type RunJobPayload = z.infer<typeof RunJobPayloadSchema>;
