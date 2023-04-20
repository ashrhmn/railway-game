import { Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      if (
        exception.message === "Forbidden resource" &&
        !host.switchToHttp().getRequest().route.methods.get
      ) {
        host.switchToHttp().getResponse().status(403).json({
          statusCode: 403,
          message: "You are not authorized to perform this action",
          timestamp: new Date().toISOString(),
        });
      } else if (exception.cause instanceof ZodError) {
        host
          .switchToHttp()
          .getResponse()
          .status(400)
          .json({
            statusCode: 400,
            message: fromZodError(exception.cause).message,
            timestamp: new Date().toISOString(),
          });
      }
    }
    super.catch(exception, host);
  }
}
