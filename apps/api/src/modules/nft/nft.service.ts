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
}
