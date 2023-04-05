import {
  CacheModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { RolesGuard } from "./guards/roles.guard";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { GameModule } from "./modules/game/game.module";
import { MapModule } from "./modules/map/map.module";
import { NftModule } from "./modules/nft/nft.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SocketModule } from "./modules/socket/socket.module";
import { UserModule } from "./modules/user/user.module";
import * as redisStore from "cache-manager-redis-store";
import { CacheManagerModule } from "./providers/cache/cache-manager.module";
import { MetadataModule } from "./modules/metadata/metadata.module";
import { BullModule } from "@nestjs/bull";
import { JobModule } from "./providers/jobs/job.module";
import { EventsModule } from "./modules/events/events.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MapModule,
    NftModule,
    GameModule,
    UserModule,
    SettingsModule,
    MetadataModule,
    ScheduleModule.forRoot(),
    SocketModule,
    JobModule,
    EventsModule,
    CacheModule.register({
      store: redisStore.create({
        host: process.env.REDIS_HOST || "localhost",
        port: +(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD,
      }),
      isGlobal: true,
      ttl: 10,
    }),
    BullModule.forRoot({
      url: `redis://${process.env.REDIS_HOST || "localhost"}:${+(
        process.env.REDIS_PORT || "6379"
      )}`,
    }),
    CacheManagerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
