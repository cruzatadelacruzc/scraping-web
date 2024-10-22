import { IQueueModule } from './queue-module.interface';
import { QContext } from '@config/queue.config';
import { Job } from 'bull';
import { ILogger } from './logger.interfaces';
import { TYPES } from './types.container';
import { container } from './container';

/**
 * Retrieves an array of all {@link IQueueModule} instances.
 *
 * @returns {ReadonlyArray<IQueueModule>} An array of all queue modules.
 */
export const getQueueModules = (): ReadonlyArray<IQueueModule> => {
  const revolicoQueues = container.get<IQueueModule>(TYPES.RevolicoQueues);
  return Object.freeze([revolicoQueues]);
};

/**
 * Initializes all queues by calling {@link IQueueModule.getQueuesToInitialize} and
 * {@link IQueueModule.getProcessor} for each queue module passed in.
 *
 * @returns {Promise<void>} A promise that resolves when all queues have been initialized.
 */
export const initializeQueues = async (): Promise<void> => {
  const log = container.get<ILogger>(TYPES.Logger);
  const qContext = container.get<QContext>(QContext);
  log.context = 'MainQueues';
  log.info('Initializing queues and setting up listeners...');

  const queueModules = getQueueModules();
  const queuesToInitialize: string[] = [];
  const queueProcessors: Map<string, (job: Job) => Promise<any>> = new Map();

  try {
    for (const module of queueModules) {
      const queues = module.getQueuesToInitialize();
      if (!queues) {
        throw new Error(`Module ${module.constructor.name} did not return an array of queues to initialize.`);
      }

      queuesToInitialize.push(...queues);

      for (const queueName of queues) {
        const processor = module.getProcessor(queueName);
        if (!processor) {
          throw new Error(`Module ${module.constructor.name} did not return a processor for queue ${queueName}.`);
        }

        queueProcessors.set(queueName, processor);
      }
    }
    await Promise.all(queuesToInitialize.map(queueName => qContext.QCreate(queueName, queueProcessors.get(queueName)!)));
    queueModules.forEach(module => module.setupQueueListeners());
  } catch (err) {
    log.error('Error initializing queues: ', err);
    throw err;
  }
};
