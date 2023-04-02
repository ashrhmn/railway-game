import { Process, Processor } from "@nestjs/bull";
import { COLOR } from "@prisma/client";
import { Job } from "bull";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { MapService } from "src/modules/map/map.service";

export type IRailMoveJobData = {
  gameId: string;
  color: COLOR;
};

@Processor(QueueJobEnum.CHECK_AND_MOVE_RAIL_BY_GAME_COLOR)
export class RailMoveJobProcessor {
  constructor(private readonly mapService: MapService) {}

  @Process({ concurrency: 10 })
  async process(job: Job<IRailMoveJobData>) {
    const { color, gameId } = job.data;
    console.log("checkAndMoveRailJob", color, gameId);
    await this.mapService.checkAndMoveRailByGameIdAndColor(gameId, color);
    return job.data;
  }
}
