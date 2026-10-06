import assert from 'node:assert/strict';
import { limitScopeForPublic, PUBLIC_SCOPE_LIMITS, ScopeConfigSchema } from '@sentinelqa/contracts';
import { isLiveRun } from './live-runs';

const now = new Date('2026-10-06T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

// A run counts while it is inside its own time limit plus a short grace period.
assert.equal(isLiveRun({ createdAt: minutesAgo(3), scopeConfig: JSON.stringify({ maxExecutionTime: 5 }) }, now), true);
assert.equal(isLiveRun({ createdAt: minutesAgo(14), scopeConfig: JSON.stringify({ maxExecutionTime: 5 }) }, now), true);
// One still marked active long after that was cut off and must not block new scans.
assert.equal(isLiveRun({ createdAt: minutesAgo(16), scopeConfig: JSON.stringify({ maxExecutionTime: 5 }) }, now), false);
// Without a stored limit the scanner default of 30 minutes applies.
assert.equal(isLiveRun({ createdAt: minutesAgo(35), scopeConfig: null }, now), true);
assert.equal(isLiveRun({ createdAt: minutesAgo(45), scopeConfig: 'not json' }, now), false);

// The public demo caps every limit and never raises one the visitor lowered.
const generous = ScopeConfigSchema.parse({ maxPages: 500, maxExecutionTime: 120, concurrency: 8, adminAreaExclusion: false });
const limited = limitScopeForPublic(generous);
assert.equal(limited.maxPages, PUBLIC_SCOPE_LIMITS.maxPages);
assert.equal(limited.maxExecutionTime, PUBLIC_SCOPE_LIMITS.maxExecutionTime);
assert.equal(limited.concurrency, 1);
assert.equal(limited.adminAreaExclusion, true);
assert.equal(limitScopeForPublic({ ...generous, maxPages: 3 }).maxPages, 3);

console.log('live runs: stale runs stop counting; public scans stay within the demo limits');
