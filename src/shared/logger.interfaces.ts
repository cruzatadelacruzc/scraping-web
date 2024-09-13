export interface ILogger {
  info(message: string, object?: any): void;
  error(message: string, object?: any): void;
  warn(message: string, object?: any): void;
  debug(message: string, object?: any): void;
  log(message: string, object?: any): void;
}