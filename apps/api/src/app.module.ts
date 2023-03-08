import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "./guards/roles.guard";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { GameModule } from "./modules/game/game.module";
import { MapModule } from "./modules/map/map.module";
import { NftModule } from "./modules/nft/nft.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UserModule } from "./modules/user/user.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MapModule,
    NftModule,
    GameModule,
    UserModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
