import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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

  @InferMethod(endpoints.nft.deleteAllNfts)
  deleteAllNfts(@Context() context: IContext) {
    return createAsyncController(
      endpoints.nft.deleteAllNfts,
      context,
      this.nftService.deleteAllNfts,
    );
  }

  @UseInterceptors(FileInterceptor("file"))
  @Post("nfts/add-csv")
  async addCsvNfts(
    @UploadedFile()
    file: { buffer: Iterable<any> | AsyncIterable<any>; mimetype: string },
    @Body() body: { replace: string; game_id: string },
  ) {
    return this.nftService.addCsvNfts(file, body);
  }
}
