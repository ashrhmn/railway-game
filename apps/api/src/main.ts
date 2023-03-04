import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./modules/prisma/prisma.service";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  const PORT = +(process.env.API_PORT || "4000");
  await app.listen(PORT);
}
bootstrap();
