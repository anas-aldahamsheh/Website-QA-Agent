import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createRedisConnection, getTestRunsQueue, pushTestRunJob } from '@sentinelqa/queue';
import { logger } from '@sentinelqa/logger';
import { prisma } from '@sentinelqa/database';
import { CheckIdSchema, ScanModeSchema, ScopeConfigSchema } from '@sentinelqa/contracts';

async function startScheduler() {
  logger.info('Scheduler starting up...');
  
  const redisConnection = createRedisConnection();
  const queue = getTestRunsQueue(redisConnection);

  logger.info('Scheduler initialization complete, polling database for scheduled runs');

  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      logger.debug('Scheduler tick: Checking schedules...');
      
      // Select runs that are ready to trigger or schedule (e.g. status DRAFT but scheduled)
      // For this vertical slice, we can query if there are any pending runs that need triggering
      const pendingRuns = await prisma.testRun.findMany({
        where: { status: 'QUEUED' },
        include: { project: true, environment: true, testProfile: true }
      });

      for (const run of pendingRuns) {
        const config = JSON.parse(run.testProfile.config) as { checks?: unknown };
        await pushTestRunJob(queue, {
          version: 1,
          runId: run.id,
          projectId: run.projectId,
          environmentId: run.environmentId,
          targetUrl: run.environment.targetUrl,
          scanMode: ScanModeSchema.parse(run.scanMode),
          scopeConfig: ScopeConfigSchema.parse(run.scopeConfig ? JSON.parse(run.scopeConfig) : {}),
          browsers: ['chromium'],
          checks: CheckIdSchema.array().parse(config.checks ?? [])
        });
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler tick failed');
    } finally {
      ticking = false;
    }
  };
  await tick();
  setInterval(tick, 60000);
}

startScheduler().catch((err) => {
  logger.fatal({ err }, 'Scheduler crashed');
  process.exit(1);
});
