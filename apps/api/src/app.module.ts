import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "./guards/roles.guard";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { NftModule } from "./modules/nft/nft.module";
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, NftModule],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
