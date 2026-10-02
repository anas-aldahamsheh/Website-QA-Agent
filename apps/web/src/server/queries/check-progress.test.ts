import assert from 'node:assert/strict';
import { IMPLEMENTED_CHECK_IDS } from '@sentinelqa/contracts';
import { buildCheckProgress, CHECK_CATALOG } from './check-progress';

const implemented = new Set<string>(IMPLEMENTED_CHECK_IDS);
const unimplemented = CHECK_CATALOG.map((check) => check.id).filter((id) => !implemented.has(id));
assert.ok(unimplemented.length > 0, 'catalog lists checks the scanner does not implement');

// A finished run must never report an unimplemented check as done.
for (const runStatus of ['QUEUED', 'EXECUTING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED']) {
  for (const id of unimplemented) {
    const progress = buildCheckProgress(id, runStatus, 'VISITED navigate RESPONSIVE viewport EVIDENCE API JSON CONTENT');
    assert.equal(progress.status, 'NOT_RUN', `${id} during ${runStatus}`);
    assert.match(progress.detail, /not implemented/i);
  }
}

// Implemented checks keep their normal lifecycle.
assert.equal(buildCheckProgress('seo', 'QUEUED', '').status, 'WAITING');
assert.equal(buildCheckProgress('seo', 'EXECUTING', '').status, 'RUNNING');
assert.equal(buildCheckProgress('seo', 'EXECUTING', 'SEO_TITLE_QUALITY').status, 'DONE');
assert.equal(buildCheckProgress('seo', 'COMPLETED', '').status, 'DONE');
assert.equal(buildCheckProgress('seo', 'FAILED', '').status, 'ATTENTION');

console.log(`check progress: ${unimplemented.length} unimplemented checks reported as not run`);
