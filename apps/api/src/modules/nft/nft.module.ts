import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { NftController } from "./nft.controller";
import { NftService } from "./nft.service";

@Module({
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService],
  imports: [
    BullModule.registerQueue({
      name: QueueJobEnum.UPDATE_NFT_OWNER,
    }),
  ],
})
export class NftModule {}
