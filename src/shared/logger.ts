import { injectable } from 'inversify';
import { ILogger } from '@shared/logger.interfaces';

@injectable()
export class Logger implements ILogger {
  private debugMode: boolean = false;
  private _className: string;

  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
    this._className = 'Logger';
  }

  set context(context: string) {
    this._className = context;
  }

  log(message: string, object?: any) {
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
  safeSerialize(object: unknown): string {
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
  validateMessage(message: unknown): string {
    if (typeof message !== 'string') {
      console.warn('Invalid message type. Expected a string.');
      return '[Invalid message type]';
    }
    return message;
  }

  debug(message: string, object?: unknown): void {
    if (!this.debugMode) return;

    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);

    console.log(`Debug: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  info(message: string, object?: unknown): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);

    console.info(`Info: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  warn(message: string, object?: unknown): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);

    console.warn(`Warn: ${this._className} - ${validatedMessage}`, serializedObject);
  }

  error(message: string, object?: any): void {
    const validatedMessage = this.validateMessage(message);
    const serializedObject = this.safeSerialize(object);

    console.error(`Error: ${this._className} - ${validatedMessage}`, serializedObject);
  }
}
