import { injectable } from 'inversify';
import { ILogger } from '@shared/logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private debugMode: boolean = false;
  private _className: string;

  public constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
    this._className = 'Logger';
  }

  public set context(context: string) {
    this._className = context;
  }

  public log(message: string, object?: any): void {
    if (this.debugMode) {
      this.debug(message, object);
    } else {
      this.info(message, object);
    }
  }

  /**
   * Serializa un objeto a JSON, manejando posibles errores de serialización.
   * @param object - El objeto que será serializado.
   * @returns Una cadena JSON serializada o un mensaje de error si la serialización falla.
   */
  public safeSerialize(object: unknown): string {
    if (object === undefined) return '';

    if (typeof object !== 'object') return object.toString();

    if (object instanceof Error) {
      return JSON.stringify(
        {
          message: object?.message,
          stack: object?.stack,
          name: object?.name,
        },
        null,
        2,
      );
    }

    try {
      return JSON.stringify(object, null, 2);
    } catch (error) {
      console.warn('Failed to serialize object to JSON:', error);
      return '[Unserializable object]';
    }
  }

  /**
   * Valida que el mensaje sea de tipo string y retorna un mensaje formateado.
   * @param message - El mensaje a validar.
   * @returns El mensaje validado, o un mensaje de advertencia si no es un string.
   */
  public validateMessage(message: unknown): string {
    if (typeof message !== 'string') {
      console.warn('Invalid message type. Expected a string.');
      return '[Invalid message type]';
    }
    return message;
  }

  /**
   * Generates a string with the current date and time in ISO 8601 format with milliseconds.
   * @returns {string} - A string with the current date and time including milliseconds.
   */
  public currentDateTime(): string {
    return new Date().toISOString();
  }

  public debug(message: string, object?: unknown): void {
    if (!this.debugMode) return;

    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);
    const timestamp = this.currentDateTime();

    console.log(`[${timestamp}] Debug: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  public info(message: string, object?: unknown): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);
    const timestamp = this.currentDateTime();

    console.info(`[${timestamp}] Info: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  public warn(message: string, object?: unknown): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);
    const timestamp = this.currentDateTime();

    console.warn(`[${timestamp}] Warn: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  public error(message: string, object?: any): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);
    const timestamp = this.currentDateTime();

    console.error(`[${timestamp}] Error: ${this._className} - ${validatedMessage}`, serializedObject);
  }
}
