import { injectable } from 'inversify';
import { ILogger } from '@shared/logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private debugMode: boolean = false;

  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  log(message: string, object?: any) {
    if (this.debugMode) {
      this.debug(message, object);
    } else {
      this.info(message, object);
    }
  }

  debug(message: string, object?: any): void {
    this.debugMode && console.log(`Debug: ${message}`, JSON.stringify(object));
  }

  info(message: string, object?: any): void {
    console.info(`Info: ${message}`, JSON.stringify(object));
  }

  warn(message: string, object?: any): void {
    console.warn(`Warn: ${message}`, JSON.stringify(object));
  }

  error(message: string, object?: any): void {
    console.error(`Error: ${message}`, JSON.stringify(object));
  }
}
