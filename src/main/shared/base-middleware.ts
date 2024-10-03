import { NextFunction, Request, Response } from "express";

/**
 * Middleware base class.
 * @abstract
 */
export abstract class BaseMiddleware {
  /**
   * @constructor.
   * Binds the context of the execute() function to the class instance.
   */
  constructor() {
    this.execute = this.execute.bind(this);
  }

  /**
   * Method that must be implemented by classes that inherit from BaseMiddleware.
   * It runs in the request flow.
   * @param {Request} req - Request object.
   * @param {Response} res - Response object.
   * @param {NextFunction} next - Function that is executed when the request is completed.
   * @returns {void | Promise<void>} - Returns nothing or a promise that resolves when the request completes.
   */
  public abstract execute(req: Request, res: Response, next: NextFunction): void | Promise<void>;
  
}