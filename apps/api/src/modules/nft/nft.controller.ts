import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";
import { NftService } from "./nft.service";

@Controller()
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @InferMethod(endpoints.nft.getNft)
  getNft(@Context() context: IContext) {
    return createAsyncController(
      endpoints.nft.getNft,
      context,
      this.nftService.getNft,
    );
  }

  @InferMethod(endpoints.nft.getAllNfts)
  getAllNfts(@Context() context: IContext) {
    return createAsyncController(
      endpoints.nft.getAllNfts,
      context,
      this.nftService.getAllNfts,
    );
  }
}
