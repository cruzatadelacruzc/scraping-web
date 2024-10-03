import { ValidationError } from '@scrapers/revolico/errors';
import { BaseMiddleware } from '@shared/base-middleware';
import { ResponseHandler } from '@shared/response-handler';
import { NextFunction, Request, Response } from 'express';

/**
 * @description Validate incoming requests
 * @extends BaseMiddleware
 */
export class ValidateRequestMiddleware extends BaseMiddleware {
  /**
   * @constructor ValidateRequestMiddleware
   * @param {Object} _DtoClass - DTO Class that defines the validation scheme `(method from())`.
   * @param {Boolean} _withParams - Indicates whether route parameters should be included in the request.
   */
  constructor(
    private readonly _DtoClass: { from: any },
    private readonly _withParams: boolean = false,
  ) {
    super();
  }

  public execute(req: Request, res: Response, next: NextFunction) {
    if (this._withParams) {
      req.body = {
        ...req.body,
        ...req.params,
      };
    }

    try {
      req.body = this._DtoClass.from(req.body);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseHandler.badRequest(res, error.message, error.validationErrors);
      }
      ResponseHandler.error(res);
    }
  }

  /**
   * @description Creates a new instance of the class,
   *  specifying parameter exclusion and returns the execute method.
   * @param  dto - Class that defines the validation scheme.
   * @returns - Execute method of the new instance.
   */
  static with(dto: any) {
    return new ValidateRequestMiddleware(dto, false).execute;
  }

  /**
   * @description Creates a new instance of the class,
   *  specifying parameter inclusion and returns the execute method.
   * @param  dto - Class that defines the validation scheme.
   * @returns - Execute method of the new instance.
   */
  static withParams(dto: any) {
    return new ValidateRequestMiddleware(dto, true).execute;
  }
}
