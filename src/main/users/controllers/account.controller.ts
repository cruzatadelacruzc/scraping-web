import { controller, httpPost, httpGet, httpPut, httpDelete, request, response } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { UserRegisterDTO } from '../dto/user-register.dto';
import { ProviderRegistrationDTO } from '../dto/provider-registration.dto';
import { AccountDTO } from '../dto/account.dto';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { UserService } from '../services/user.service';
import { AccountService } from '../services/account.service';

@controller('/api/accounts')
export class AccountController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.UserService) private readonly _userService: UserService,
    @inject(TYPES.AccountService) private readonly _accountService: AccountService,
  ) {
    this._log.context = AccountController.name;
  }

  // ── Account CRUD ───────────────────────────────────────────────

  @httpPost('/', ValidateRequestMiddleware.with(AccountDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    const dto = AccountDTO.from(req.body);
    if (dto.id) return ResponseHandler.badRequest(res, 'Account ID is not allowed on creation');
    const account = await this._accountService.register(dto);
    ResponseHandler.created(res, 'http:created', { account });
  }

  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() _req: Request, @response() res: Response): Promise<void> {
    const accounts = await this._accountService.getAll();
    ResponseHandler.ok(res, { accounts });
  }

  @httpGet('/:id', TYPES.AuthMiddleware)
  public async get(@request() req: Request, @response() res: Response): Promise<void> {
    const account = await this._accountService.getById(req.params.id);
    ResponseHandler.wrapOrNotFound(res, { account });
  }

  @httpPut('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async update(@request() req: Request, @response() res: Response): Promise<void> {
    const dto = AccountDTO.from(req.body);
    const account = await this._accountService.update(req.params.id, dto);
    ResponseHandler.updated(res, { account });
  }

  @httpDelete('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    await this._accountService.delete(req.params.id);
    ResponseHandler.deleted(res);
  }

  // ── User Registration ──────────────────────────────────────────

  @httpPost('/register/local', ValidateRequestMiddleware.with(UserRegisterDTO))
  public async registerLocal(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const registerRequest = UserRegisterDTO.from(req.body);
      this._log.debug('REST request to register user with local credentials', {
        email: registerRequest.email,
        username: registerRequest.username,
        accountId: registerRequest.accountId,
      });

      const accountId = registerRequest.accountId || req.body.accountId;
      const authResponse = await this._userService.registerLocal(registerRequest, accountId);
      ResponseHandler.created(res, 'http:created', {
        user: authResponse.user,
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
      });
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : 'Unknown';
      const errorMsg = err instanceof Error ? err.message : String(err);
      this._log.error('Local registration failed', { errorName, errorMsg });
      if (err instanceof Error) {
        if (err.name === 'AccountNotFoundError' || err.message.includes('not found')) {
          return ResponseHandler.notFound(res, err.message);
        }
        if (err.name === 'ConflictError' || err.message.includes('already')) {
          return ResponseHandler.error(res, err.message, 409);
        }
        if (err.name === 'InvalidArgumentError' || err.message.includes('Missing')) {
          return ResponseHandler.badRequest(res, err.message);
        }
      }
      return ResponseHandler.error(res, 'Registration failed', 500);
    }
  }

  @httpPost('/register/provider', ValidateRequestMiddleware.with(ProviderRegistrationDTO))
  public async registerWithProvider(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const registerRequest = ProviderRegistrationDTO.from(req.body);
      this._log.debug('REST request to register user with provider', {
        email: registerRequest.email,
        username: registerRequest.username,
        provider: registerRequest.provider,
      });

      const accountId = registerRequest.accountId || req.body.accountId;
      const authResponse = await this._userService.registerWithProvider(registerRequest, accountId);
      ResponseHandler.created(res, 'http:created', {
        user: authResponse.user,
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
      });
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : 'Unknown';
      const errorMsg = err instanceof Error ? err.message : String(err);
      this._log.error('Provider registration failed', { errorName, errorMsg });
      if (err instanceof Error) {
        if (err.name === 'AccountNotFoundError' || err.message.includes('not found')) {
          return ResponseHandler.notFound(res, err.message);
        }
        if (err.name === 'ConflictError' || err.message.includes('already')) {
          return ResponseHandler.error(res, err.message, 409);
        }
        if (err.name === 'InvalidArgumentError' || err.message.includes('Missing')) {
          return ResponseHandler.badRequest(res, err.message);
        }
      }
      ResponseHandler.error(res, 'Registration failed', 500);
    }
  }
}
