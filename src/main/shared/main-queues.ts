import { container } from '@shared/container';
import { IQueueModule } from './queue-module.interface';
import { ILogger } from './logger.interface';
import { TYPES } from './types.container';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';

/**
 * Retrieves an array of all {@link IQueueModule} instances.
 *
 * @returns {ReadonlyArray<IQueueModule>} An array of all queue modules.
 */
export const getQueueModules = (): ReadonlyArray<IQueueModule> => {
  const revolicoQueues = container.get<IQueueModule>(TYPES.RevolicoQueues);
  const botQueues = container.get<IQueueModule>(TYPES.BotQueues);
  return Object.freeze([revolicoQueues, botQueues]);
};

/**
 * Initializes all queues: for each {@link IQueueModule} it asks for the list
 * of queues to initialize, then registers the module's processor with the
 * active queue adapter (selected by the {@link IQueueAdapterRegistry}).
 *
 * @returns {Promise<void>} A promise that resolves when all queues have been initialized.
 */
export const initializeQueues = async (): Promise<void> => {
  const log = container.get<ILogger>(TYPES.Logger);
  const registry = container.get<IQueueAdapterRegistry>(TYPES.QueueAdapterRegistry);
  const adapter = registry.getCurrent();
  log.context = 'MainQueues';
  log.info(`Initializing queues and setting up listeners (backend=${adapter.backend})...`);

  const queueModules = getQueueModules();

  try {
    for (const module of queueModules) {
      const queues = module.getQueuesToInitialize();
      if (!queues) {
        throw new Error(`Module ${module.constructor.name} did not return an array of queues to initialize.`);
      }

      for (const queueName of queues) {
        const processor = module.getProcessor(queueName);
        if (!processor) {
          throw new Error(`Module ${module.constructor.name} did not return a processor for queue ${queueName}.`);
        }
        adapter.registerWorker(queueName, processor);
      }
    }
    queueModules.forEach(module => module.setupQueueListeners());
  } catch (err) {
    log.error('Error initializing queues: ', err);
    throw err;
  }
};
