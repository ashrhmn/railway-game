import { Module } from "@nestjs/common";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  providers: [GameService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
