import { controller, httpPost, request, response } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { UserLoginDTO } from '../dto/user-login.dto';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { AuthService } from '../services/auth.service';

@controller('/api/auth')
export class AuthController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.AuthService) private readonly _authService: AuthService,
  ) {
    this._log.context = AuthController.name;
  }

  @httpPost('/login', ValidateRequestMiddleware.with(UserLoginDTO))
  public async login(@request() req: Request, @response() res: Response): Promise<void> {
    const dto = UserLoginDTO.from(req.body);
    this._log.debug('REST request to login', { username: dto.username });
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    const authResponse = await this._authService.login(dto, ip, userAgent);
    ResponseHandler.ok(res, {
      user: authResponse.user,
      token: authResponse.token,
      refreshToken: authResponse.refreshToken,
    });
  }
}
