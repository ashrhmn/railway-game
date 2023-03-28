import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ethers } from "ethers";
import { CONFIG } from "./config/app.config";
import { NftService } from "./modules/nft/nft.service";
import { PrismaService } from "./modules/prisma/prisma.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nftService: NftService,
  ) {}
  async onModuleDestroy() {
    console.log("AppService destroyed");
    const games = await this.prisma.game.findMany({
      where: {
        contractAddress: { not: null },
        chainId: { in: CONFIG.SUPPORTED_CHAINS },
      },
    });

    games.forEach((game) => {
      if (!game.contractAddress || !game.chainId) return;
      const contract = new ethers.Contract(
        game.contractAddress,
        CONFIG.ABI.SAMPLE721,
        CONFIG.PROVIDER(game.chainId),
      );

      contract.removeAllListeners("Transfer");
    });
  }
  async onModuleInit() {
    if (CONFIG.NODE_ENV.toLowerCase() === "production")
      this.nftService.updateAllNftOwners();
    console.log("AppService initialized");
    const games = await this.prisma.game.findMany({
      where: {
        contractAddress: { not: null },
        chainId: { in: CONFIG.SUPPORTED_CHAINS },
      },
    });

    games.forEach((game) => {
      if (!game.contractAddress || !game.chainId) return;
      const contract = new ethers.Contract(
        game.contractAddress,
        CONFIG.ABI.SAMPLE721,
        CONFIG.PROVIDER(game.chainId),
      );

      contract.on("Transfer", async (_from, to, tokenId) => {
        await this.prisma.nft.update({
          where: {
            tokenId_gameId: { tokenId: tokenId.toNumber(), gameId: game.id },
          },
          data: { owner: to },
        });
      });
    });
  }
}
