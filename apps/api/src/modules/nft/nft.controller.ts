import {
  Body,
  Controller,
  Param,
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
import { Roles } from "src/guards/roles.guard";

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

  @Roles("ADMIN")
  @InferMethod(endpoints.nft.deleteAllNfts)
  deleteAllNfts(@Context() context: IContext) {
    return createAsyncController(
      endpoints.nft.deleteAllNfts,
      context,
      this.nftService.deleteAllNfts,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.nft.randomizeFixTokenId)
  randomizeFixTokenId(@Context() context: IContext) {
    return createAsyncController(
      endpoints.nft.randomizeFixTokenId,
      context,
      this.nftService.randomizeFixTokenId,
    );
  }

  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  @Post("nfts/add-csv")
  async addCsvNfts(
    @UploadedFile()
    file: { buffer: Iterable<any> | AsyncIterable<any>; mimetype: string },
    @Body() body: { replace: string; game_id: string },
  ) {
    return this.nftService.addCsvNfts(file, body);
  }

  @Roles("ADMIN")
  @Post("nfts/update-owners/:gameId")
  updateNftOwnersByGameId(@Param("gameId") gameId: string) {
    this.nftService.updateNftOwnersByGameId(gameId);
    return "queued";
  }
}
