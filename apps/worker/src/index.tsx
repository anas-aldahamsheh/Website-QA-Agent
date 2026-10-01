import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { Worker, type ConnectionOptions } from 'bullmq';
import { createRedisConnection, TEST_RUNS_QUEUE } from '@sentinelqa/queue';
import { RunJobPayloadSchema } from '@sentinelqa/contracts';
import { prisma } from '@sentinelqa/database';
import { logger } from '@sentinelqa/logger';
import { runJobById } from './runner';

async function startLocalPollingWorker() {
  logger.info('Starting Local SQLite Polling Worker (No Redis required)...');
  let isProcessing = false;

  const pollInterval = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const queuedRun = await prisma.testRun.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' }
      });

      if (!queuedRun) return;

      logger.info({ runId: queuedRun.id }, 'Worker picked up QUEUED run from SQLite');
      await runJobById(queuedRun.id);
    } catch (err) {
      logger.error({ err }, 'Error during local queue polling');
    } finally {
      isProcessing = false;
    }
  }, 2000);

  const shutdown = () => {
    clearInterval(pollInterval);
    logger.info('Local worker stopped');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startRedisWorker() {
  logger.info('Background Worker starting up with Redis...');
  const redisConnection = createRedisConnection();

  const worker = new Worker(
    TEST_RUNS_QUEUE,
    async (job) => {
      logger.info({ jobId: job.id }, 'Received job from queue');
      try {
        const payload = RunJobPayloadSchema.parse(job.data);
        await runJobById(payload.runId);
        logger.info({ runId: payload.runId }, 'Job completed successfully');
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Failed to process queue job');
        throw error;
      }
    },
    {
      connection: redisConnection as unknown as ConnectionOptions,
      concurrency: 2
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job processing failed in BullMQ');
  });

  logger.info('Worker initialized with Redis, listening for jobs');
}

async function startWorker() {
  if (process.env['REDIS_URL']) {
    await startRedisWorker();
  } else {
    await startLocalPollingWorker();
  }
}

startWorker().catch((err) => {
  logger.fatal({ err }, 'Worker process crashed');
  process.exit(1);
});
