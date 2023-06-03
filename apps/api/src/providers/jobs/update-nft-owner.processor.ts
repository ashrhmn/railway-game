import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { CONFIG } from "src/config/app.config";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { NftService } from "src/modules/nft/nft.service";

export type IUpdateNftOwnerJobData = {
  address: string;
  chainId: number;
  tokenId: number;
};

@Processor(QueueJobEnum.UPDATE_NFT_OWNER)
export class UpdateNftOwnerJobProcessor {
  constructor(private readonly nftService: NftService) {}

  @Process({ concurrency: 30 })
  async process(job: Job<IUpdateNftOwnerJobData>) {
    if (CONFIG.NOT_FIRST_INSTANCE) {
      console.warn(
        "IGNORE_CAUSED_BY_NOT_FIRST_INSTANCE",
        "OWNER_UPDAATE_JOB",
        job.data,
      );
      return job.data;
    }
    const { address, chainId, tokenId } = job.data;
    // console.log("updateNftOwnerJob", chainId, address, tokenId);
    await this.nftService.updateNftOwner({ address, chainId, tokenId });
    return job.data;
  }
}
