import assert from 'node:assert/strict';
import { progressRequestPath } from './progress-request';

// Without a selected run the panel must ask for the latest run, never the run it showed before.
assert.equal(progressRequestPath(undefined), '/api/run-progress');
assert.equal(progressRequestPath(''), '/api/run-progress');
assert.equal(progressRequestPath('6f1c2a7e-0d4b-4c1e-9a3f-2b8d5e7c9a10'), '/api/run-progress?runId=6f1c2a7e-0d4b-4c1e-9a3f-2b8d5e7c9a10');

console.log('progress request: follows the latest run unless a run is selected');
