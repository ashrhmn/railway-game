import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  providers: [GameService],
  controllers: [GameController],
  exports: [GameService],
  imports: [EventsModule],
})
export class GameModule {}
