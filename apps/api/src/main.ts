import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./modules/prisma/prisma.service";
import * as cookieParser from "cookie-parser";
import { AllExceptionsFilter } from "./filters/all-exception.filter";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { QueueJobEnum } from "./enums/queue-job.enum";
import { Queue } from "bull";
import { ExpressAdapter } from "@bull-board/express";
import * as morgan from "morgan";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(
    morgan("tiny", {
      stream: {
        write(str) {
          console.log(str.replace("\n", ""), "PID :", process.pid);
        },
      },
    }),
  );
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  app.useWebSocketAdapter(new IoAdapter(app));
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/_bull-board");
  createBullBoard({
    queues: Object.values(QueueJobEnum).map(
      (key) => new BullAdapter(app.get<Queue>(`BullQueue_${key}`)),
    ),
    serverAdapter,
  });

  app.use("/api/_bull-board", serverAdapter.getRouter());
  const PORT = +(process.env.API_PORT || "4000");
  await app.listen(PORT);
}
bootstrap();
