import { Module } from "@nestjs/common";
import { MapModule } from "src/modules/map/map.module";
import { RailMoveJobProcessor } from "./rail-move-job.processor";

@Module({
  providers: [RailMoveJobProcessor],
  imports: [MapModule],
})
export class JobModule {}
