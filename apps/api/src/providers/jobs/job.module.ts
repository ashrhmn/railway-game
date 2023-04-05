import { Module } from "@nestjs/common";
import { MapModule } from "src/modules/map/map.module";
import { NftModule } from "src/modules/nft/nft.module";
import { RailMoveJobProcessor } from "./rail-move-job.processor";
import { UpdateNftOwnerJobProcessor } from "./update-nft-owner.processor";

@Module({
  providers: [RailMoveJobProcessor, UpdateNftOwnerJobProcessor],
  imports: [MapModule, NftModule],
})
export class JobModule {}
