import { Queue, Job, type ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { RunJobPayloadSchema, RunJobPayload } from '@sentinelqa/contracts';
import { logger } from '@sentinelqa/logger';

// Redis connection instance creator
export function createRedisConnection(): Redis {
  const redisUrl = process.env['REDIS_URL'] || 'redis://127.0.0.1:6379';
  logger.info({ redisHost: new URL(redisUrl).host }, 'Initializing Redis connection');
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

// Queue name configuration
export const TEST_RUNS_QUEUE = 'test-runs';

// Initialize the test runs queue
export function getTestRunsQueue(connection: Redis): Queue {
  return new Queue(TEST_RUNS_QUEUE, {
    connection: connection as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 1,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  });
}

// Push a validated job payload to the queue
export async function pushTestRunJob(
  queue: Queue,
  payload: RunJobPayload
): Promise<Job> {
  // Validate request schema before adding to the queue
  const parsed = RunJobPayloadSchema.parse(payload);
  
  logger.info({ runId: parsed.runId }, 'Enqueueing test run job');
  return queue.add(`run-${parsed.runId}`, parsed, {
    jobId: parsed.runId,
    priority: 10
  });
}
