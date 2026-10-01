import assert from 'node:assert/strict';
import { AuditFindingInputSchema, ScopeConfigSchema } from '@sentinelqa/contracts';
import { buildScannerUserAgent, classifyUrl, getBackoffMs, getEffectiveLoadPolicy, isUrlAllowed, normalizeUrl, parseRetryAfterMs } from './index';
import { decryptCredential, encryptCredential, isPublicIpAddress, validateTargetUrl } from '@sentinelqa/security';

const scope = ScopeConfigSchema.parse({
  protocolPolicy: 'HTTPS_ONLY',
  includePatterns: ['/docs*'],
  excludePatterns: ['/docs/private*'],
  queryParamDenylist: ['utm_*', 'token'],
  fragmentPolicy: 'IGNORE'
});

assert.equal(
  normalizeUrl('HTTPS://Example.com:443/docs/?b=2&utm_source=x&a=1#section', scope),
  'https://example.com/docs?a=1&b=2'
);

assert.deepEqual(
  isUrlAllowed('https://example.com/docs/guide', 'https://example.com', scope),
  { allowed: true, reason: 'Allowed by configured crawl policy' }
);

assert.equal(
  isUrlAllowed('https://example.com/docs/private/report', 'https://example.com', scope).allowed,
  false
);

assert.equal(
  isUrlAllowed('http://example.com/docs/guide', 'https://example.com', scope).allowed,
  false
);

assert.equal(
  isUrlAllowed('https://localhost/docs/guide', 'https://example.com', scope).allowed,
  false
);
assert.equal(isUrlAllowed('javascript:alert(1)', 'https://example.com', scope).allowed, false);
assert.equal(isUrlAllowed('https://example.com.evil.test/docs', 'https://example.com', ScopeConfigSchema.parse({ subdomainPolicy: 'ALL_SUBDOMAINS' })).allowed, false);
assert.equal(isUrlAllowed('https://docs.example.com/docs', 'https://example.com', ScopeConfigSchema.parse({ subdomainPolicy: 'ALL_SUBDOMAINS' })).allowed, true);
for (const address of ['127.0.0.1', '10.0.0.1', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fc00::1', '::ffff:127.0.0.1']) {
  assert.equal(isPublicIpAddress(address), false, address);
}
assert.equal(isPublicIpAddress('8.8.8.8'), true);
assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
const previousMasterKey = process.env['ENCRYPTION_MASTER_KEY'];
process.env['ENCRYPTION_MASTER_KEY'] = 'test-only-master-key-with-32-or-more-bytes';
const encryptedCredential = encryptCredential('secret for test');
assert.equal(decryptCredential(encryptedCredential), 'secret for test');
assert.throws(() => decryptCredential(`${encryptedCredential.slice(0, -2)}xx`));
if (previousMasterKey === undefined) delete process.env['ENCRYPTION_MASTER_KEY'];
else process.env['ENCRYPTION_MASTER_KEY'] = previousMasterKey;
void Promise.all([
  validateTargetUrl('http://127.0.0.1/admin'),
  validateTargetUrl('https://[::1]/'),
  validateTargetUrl('file:///etc/passwd')
]).then((results) => assert.deepEqual(results, [false, false, false])).catch((error) => {
  throw error;
});

const finding = AuditFindingInputSchema.parse({
  rule: 'SEO_TITLE_QUALITY',
  pageUrl: 'https://example.com/docs',
  browser: 'chromium',
  viewport: '1440x900',
  evidence: 'titleLength=0',
  severity: 'MEDIUM',
  confidence: 0.9,
  reproductionContext: {
    runId: '11111111-1111-4111-8111-111111111111',
    pageUrl: 'https://example.com/docs',
    browser: 'chromium',
    viewport: '1440x900',
    deterministicFirst: true
  }
});

assert.equal(finding.rule, 'SEO_TITLE_QUALITY');

assert.equal(classifyUrl('https://example.com/report.pdf', 'https://example.com').type, 'DOWNLOAD');
assert.equal(classifyUrl('https://example.com/assets/app.js', 'https://example.com').type, 'SCRIPT');
assert.equal(classifyUrl('https://example.com/api/runs', 'https://example.com').type, 'API_ENDPOINT');
assert.equal(classifyUrl('https://cdn.example.net/app.js', 'https://example.com').type, 'EXTERNAL_LINK');
assert.equal(
  classifyUrl('https://example.com/download', 'https://example.com', { contentDisposition: 'attachment; filename="report.csv"' }).type,
  'DOWNLOAD'
);
assert.equal(
  classifyUrl('https://example.com/data', 'https://example.com', { contentType: 'application/json' }).type,
  'API_ENDPOINT'
);

assert.equal(parseRetryAfterMs('30', 1_000, 120_000), 30_000);
assert.equal(parseRetryAfterMs('not-a-date', 1_000, 120_000), null);
assert.equal(parseRetryAfterMs('Fri, 26 Jun 2026 00:01:00 GMT', Date.parse('Fri, 26 Jun 2026 00:00:00 GMT'), 120_000), 60_000);
assert.equal(getBackoffMs(2, 0.5, 1000, 60_000), 2000);
assert.equal(getBackoffMs(20, 1, 1000, 60_000), 60_000);

const classified = [
  'https://example.com/docs/page-1',
  'https://example.com/docs/file.pdf',
  'https://example.com/docs/image.png',
  'https://example.com/api/status',
  'https://example.com/docs/page-2'
].map((url) => classifyUrl(url, 'https://example.com').type);
assert.equal(classified.filter((type) => type === 'HTML_PAGE').length, 2);
assert.equal(classified.includes('DOWNLOAD'), true);
assert.equal(classified.includes('API_ENDPOINT'), true);

for (const limit of [1, 5, 10, 25, 100]) {
  const urls = Array.from({ length: limit + 5 }, (_, index) => `https://example.com/docs/page-${index}`);
  const htmlPages = urls.map((url) => classifyUrl(url, 'https://example.com').type).filter((type) => type === 'HTML_PAGE');
  assert.equal(htmlPages.slice(0, limit).length, limit);
}

assert.equal(
  classifyUrl('https://example.com/temporary', 'https://example.com', { statusCode: 503, contentType: 'text/html' }).type,
  'HTML_PAGE'
);
assert.equal(
  classifyUrl('https://example.com/forbidden', 'https://example.com', { statusCode: 403, contentType: 'text/html' }).type,
  'HTML_PAGE'
);

const effectiveLoadPolicy = getEffectiveLoadPolicy(ScopeConfigSchema.parse({
  ...scope,
  concurrency: 4,
  perHostConcurrency: 8,
  requestsPerSecond: 5,
  requestsPerSecondPerHost: 10,
  htmlPageConcurrency: 2,
  apiConcurrency: 3,
  assetConcurrency: 4,
  externalLinkConcurrency: 5
}));
assert.deepEqual(effectiveLoadPolicy, {
  globalConcurrency: 1,
  perHostConcurrency: 1,
  requestsPerSecond: 5,
  requestsPerSecondPerHost: 5,
  htmlPageConcurrency: 1,
  apiConcurrency: 0,
  assetConcurrency: 0,
  externalLinkConcurrency: 0
});

const defaultUserAgent = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
assert.equal(
  buildScannerUserAgent(defaultUserAgent, ScopeConfigSchema.parse({ ...scope, identifyScanner: false })),
  defaultUserAgent
);
assert.equal(
  buildScannerUserAgent(defaultUserAgent, ScopeConfigSchema.parse({ ...scope, scannerUserAgentProduct: 'SiteScope Scanner', scannerContact: 'qa@example.com' })).includes('SiteScope-Scanner/1.0'),
  true
);

const fixtureMatrix = [
  { url: 'https://example.com/docs/manual.pdf', type: 'DOWNLOAD' },
  { url: 'https://example.com/image.png', type: 'IMAGE' },
  { url: 'https://example.com/api/status', type: 'API_ENDPOINT' },
  { url: 'https://external.test/page', type: 'EXTERNAL_LINK' },
  { url: 'https://example.com/app.js', type: 'SCRIPT' },
  { url: 'https://example.com/fonts/app.woff2', type: 'FONT' }
] as const;
for (const fixture of fixtureMatrix) {
  assert.equal(classifyUrl(fixture.url, 'https://example.com').type, fixture.type);
}

console.log('whole-site audit contract tests passed');
