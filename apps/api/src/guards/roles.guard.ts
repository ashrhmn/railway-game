import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE } from "@prisma/client";
import { IContextRequest } from "src/interfaces";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<ROLE[]>("roles", context.getHandler());
    if (!roles) {
      return true;
    }
    if (roles.length === 0) return true;
    const request: IContextRequest = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) return false;

    return roles
      .map((r) => r.toLowerCase())
      .some((rr) => user.roles.map((r) => r.toLowerCase()).includes(rr));
  }
}

export const Roles = (...roles: ROLE[]) => SetMetadata("roles", roles);
