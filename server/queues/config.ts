import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

export const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const queues = {
  email: new Queue('email', { connection }),
  telegram: new Queue('telegram', { connection }),
  invoice: new Queue('invoice', { connection }),
  stockAlert: new Queue('stock-alert', { connection }),
  reports: new Queue('reports', { connection }),
  export: new Queue('export', { connection }),
};

export const addJob = async (
  queueName: keyof typeof queues,
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
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    logger.info({ queue: name }, 'Queue closed');
  }
};
