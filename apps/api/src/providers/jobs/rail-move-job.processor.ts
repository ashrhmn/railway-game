import { Process, Processor } from "@nestjs/bull";
import { COLOR } from "@prisma/client";
import { Job } from "bull";
import { CONFIG } from "src/config/app.config";
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
    if (CONFIG.NOT_FIRST_INSTANCE) return job.data;
    const { color, gameId } = job.data;
    console.log("checkAndMoveRailJob", color, gameId);
    await this.mapService.checkAndMoveRailByGameIdAndColor(gameId, color);
    return job.data;
  }
}
