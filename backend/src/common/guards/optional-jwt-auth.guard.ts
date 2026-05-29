import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;

    if (!authorization) {
      request.user = undefined;
      return true;
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      request.user = undefined;
      return true;
    }
  }
}