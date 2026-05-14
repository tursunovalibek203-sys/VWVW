import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Only initialize queues if Redis is configured
interface Queues {
  email?: Queue;
  telegram?: Queue;
  invoice?: Queue;
  stockAlert?: Queue;
  reports?: Queue;
  export?: Queue;
  [key: string]: Queue | undefined;
}

let queues: Queues = {};

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  queues = {
    email: new Queue('email', { connection }),
    telegram: new Queue('telegram', { connection }),
    invoice: new Queue('invoice', { connection }),
    stockAlert: new Queue('stock-alert', { connection }),
    reports: new Queue('reports', { connection }),
    export: new Queue('export', { connection }),
  };
  console.log('✅ Queues initialized with Redis');
} else {
  console.log('⚠️ Redis not configured - queues disabled (localhost mode)');
}

export { queues };

export const addJob = async (
  queueName: string,
  jobType: string,
  data: any,
  options?: {
    delay?: number;
    attempts?: number;
    priority?: number;
    jobId?: string;
  }
) => {
  const queue = queues[queueName];
  
  if (!queue) {
    logger.warn(
      { queue: queueName, type: jobType },
      'Queue not available - job skipped (Redis not configured)'
    );
    return null;
  }
  
  const job = await queue.add(jobType, data, {
    attempts: options?.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  logger.info(
    { jobId: job.id, queue: queueName, type: jobType },
    'Job added to queue'
  );

  return job;
};

export const closeQueues = async () => {
  const queueEntries = Object.entries(queues) as [string, Queue][];
  for (const [name, queue] of queueEntries) {
    if (queue && typeof queue.close === 'function') {
      await queue.close();
      logger.info({ queue: name }, 'Queue closed');
    }
  }
};
