import path from 'node:path';
import dotenv from 'dotenv';

// Ensure root .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { executeTestRun } from '@sentinelqa/test-engine';
import { prisma } from '@sentinelqa/database';
import { logger } from '@sentinelqa/logger';
import { CheckIdSchema, ScopeConfigSchema } from '@sentinelqa/contracts';

export async function runJobById(runId: string) {
  logger.info({ runId }, 'Local runner starting execution for TestRun');

  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: { environment: true, testProfile: true }
  });

  if (!run) {
    logger.error({ runId }, 'TestRun not found in SQLite database');
    return;
  }

  const parsedScope = ScopeConfigSchema.parse(run.scopeConfig ? JSON.parse(run.scopeConfig) : {});
  const savedConfig = JSON.parse(run.testProfile.config) as { checks?: unknown };
  const checks = CheckIdSchema.array().parse(savedConfig.checks ?? []);

  const steps = [
    { action: 'navigate' as const, value: run.environment.targetUrl },
    { action: 'assertVisible' as const, target: 'body' }
  ];

  await executeTestRun({
    runId: run.id,
    targetUrl: run.environment.targetUrl,
    browserType: 'chromium',
    steps,
    scanMode: run.scanMode,
    scopeConfig: parsedScope,
    checks
  });

  logger.info({ runId }, 'Local runner completed successfully');
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) {
    logger.error('No runId provided to runner');
    process.exit(1);
  }
  runJobById(runId)
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err, runId }, 'Fatal error during run execution');
      process.exit(1);
    });
}
