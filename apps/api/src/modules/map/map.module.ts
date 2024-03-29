import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { GameModule } from "../game/game.module";
import { NftModule } from "../nft/nft.module";
import { MapController } from "./map.controller";
import { MapService } from "./map.service";

@Module({
  providers: [MapService],
  exports: [MapService],
  controllers: [MapController],
  imports: [
    BullModule.registerQueue({
      name: QueueJobEnum.CHECK_AND_MOVE_RAIL_BY_GAME_COLOR,
    }),
    GameModule,
    NftModule,
  ],
})
export class MapModule {}
