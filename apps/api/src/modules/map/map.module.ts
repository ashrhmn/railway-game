import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QueueJobEnum } from "src/enums/queue-job.enum";
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
  ],
})
export class MapModule {}
