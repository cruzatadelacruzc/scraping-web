import { injectable } from 'inversify';
import { ILogger } from '@shared/logger.interfaces';

@injectable()
export class Logger implements ILogger{
  private debugMode: boolean = false;

  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  log(message: string) {
    if (this.debugMode) {
      this.debug(message);
    } else {
      this.info(message);
    }
  }

  debug(message: string): void {
    this.debugMode && console.log(`Debug: ${message}`);
  }

  info(message: string): void {
    console.info(`Info: ${message}`);
  }

  warn(message: string): void {
    console.warn(`Warn: ${message}`);
  }
  
  error(message: string): void {
    console.error(`Error: ${message}`);
  }
}
