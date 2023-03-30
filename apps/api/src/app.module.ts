import {
  CacheModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AppService } from "./app.service";
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

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MapModule,
    NftModule,
    GameModule,
    UserModule,
    SettingsModule,
    ScheduleModule.forRoot(),
    SocketModule,
    CacheModule.register({
      store: redisStore.create({
        host: process.env.REDIS_HOST || "localhost",
        port: +(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD,
      }),
      isGlobal: true,
      ttl: 10,
    }),
    CacheManagerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }, AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
