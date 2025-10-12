import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/user.entity';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a property name is specified, return that property
    if (data) {
      return user?.[data];
    }

    // Otherwise return the full user object
    return user;
  },
);
