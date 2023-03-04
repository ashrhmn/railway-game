import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { IEndpoint } from "api-interface";
import { Request } from "express";
import { IContextRequest } from "src/interfaces";

export const Input = createParamDecorator<IEndpoint<any, any, any, any>>(
  ({ bodySchema, paramSchema, querySchema }, context: ExecutionContext) => {
    const req: Request = context.switchToHttp().getRequest();

    if (!req)
      throw new HttpException(
        "Not implemented",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    try {
      const param = paramSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      const query = querySchema.parse(req.query);
      return { param, body, query };
    } catch (error) {
      throw new BadRequestException(error);
    }
  },
);

export const Context = createParamDecorator((_, context: ExecutionContext) => {
  const req: IContextRequest = context.switchToHttp().getRequest();
  const res: Response = context.switchToHttp().getResponse();
  const user = req.user;
  return { req, res, user };
});
