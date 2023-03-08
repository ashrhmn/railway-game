import { Catch, ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof ZodError) {
      host
        .switchToHttp()
        .getResponse()
        .status(400)
        .json({
          statusCode: 400,
          message: fromZodError(exception).toString(),
          timestamp: new Date().toISOString(),
        });
    }
    super.catch(exception, host);
  }
}
