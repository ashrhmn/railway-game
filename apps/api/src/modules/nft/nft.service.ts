import { HttpException, Injectable } from "@nestjs/common";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NftService {
  constructor(private readonly prisma: PrismaService) {}

  getNft = createAsyncService<typeof endpoints.nft.getNft>(
    async ({ param: { id } }) => {
      const nft = await this.prisma.nft.findFirst({
        where: { id },
        include: { nftMetadata: true },
      });
      if (!nft) throw new HttpException("NFT not found", 404);
      return nft;
    },
  );

  getAllNfts = createAsyncService<typeof endpoints.nft.getAllNfts>(
    async ({ query: { skip, take } }) => {
      const nfts = await this.prisma.nft.findMany({
        include: { nftMetadata: true },
        take,
        skip,
      });
      return nfts;
    },
  );
}
