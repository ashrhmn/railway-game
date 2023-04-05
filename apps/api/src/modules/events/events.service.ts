import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ethers } from "ethers";
import { CONFIG } from "src/config/app.config";
import { NftService } from "../nft/nft.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nftService: NftService,
  ) {}
  async onModuleDestroy() {
    console.log("EventService destroyed");
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
    console.log("EventService initialized");
    const games = await this.prisma.game.findMany({
      where: {
        contractAddress: { not: null },
        chainId: { in: CONFIG.SUPPORTED_CHAINS },
      },
    });

    games.forEach((game) => {
      if (!game.contractAddress || !game.chainId) return;
      this.addEventListenerForGame(game.contractAddress, game.chainId, game.id);
    });
  }

  async addEventListenerForGame(
    address: string,
    chainId: number,
    gameId: string,
  ) {
    console.log("add event listener for game", address, chainId);
    const contract = new ethers.Contract(
      address,
      CONFIG.ABI.SAMPLE721,
      CONFIG.PROVIDER(chainId),
    );

    contract.on("Transfer", async (_from, to, tokenId) => {
      console.log(
        "Transfer event, updating owners",
        gameId,
        address,
        "owner:",
        to,
        tokenId.toNumber(),
      );
      await this.prisma.nft.update({
        where: {
          tokenId_gameId: { tokenId: tokenId.toNumber(), gameId },
        },
        data: { owner: to },
      });
    });
  }
}
