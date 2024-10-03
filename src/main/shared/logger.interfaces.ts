export interface ILogger {
  /**
   * Sets the logging context, typically the name of the class using the logger.
   * This helps to identify which part of the application is generating the logs.
   *
   * @param {string} context - The context for the logger, usually set to the class name.
   */
  set context(context: string);
  info(message: string, object?: unknown): void;
  error(message: string, object?: unknown): void;
  warn(message: string, object?: unknown): void;
  debug(message: string, object?: unknown): void;
  log(message: string, object?: unknown): void;
}