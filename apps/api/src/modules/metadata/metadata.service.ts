import { Injectable, NotFoundException } from "@nestjs/common";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  tokenUri = createAsyncService<typeof endpoints.metadata.tokenUri>(
    async ({ query: { address, network, tokenId } }) => {
      const nft = await this.prisma.nft.findFirst({
        where: {
          game: { contractAddress: address, chainId: network },
          tokenId,
        },
        select: {
          name: true,
          description: true,
          image: true,
          abilityB: true,
          abilityK: true,
          abilityL: true,
          abilityR: true,
          color: true,
          job: true,
          level: true,
          metadata: true,
        },
      });
      if (!nft) throw new NotFoundException();
      const attributes = [
        ...nft.metadata.map((v: { type: string; value: any }) => ({
          trait_type: v.type,
          value: v.value,
        })),
        { trait_type: "Level", value: nft.level },
        { trait_type: "Job", value: nft.job },
        { trait_type: "Color", value: nft.color },
        { trait_type: "Ability B", value: nft.abilityB },
        { trait_type: "Ability K", value: nft.abilityK },
        { trait_type: "Ability L", value: nft.abilityL },
        { trait_type: "Ability R", value: nft.abilityR },
      ];
      return {
        name: nft.name,
        description: nft.description,
        image: nft.image,
        attributes,
        traits: attributes,
      };
    },
  );

  contractUri = createAsyncService<typeof endpoints.metadata.contractUri>(
    async ({ query: { address, network, royalty } }) => {
      const proxiedData = await fetch(
        `https://hydromint.xyz/api/v1/contract-uri?address=${address}&network=${network}&royalty=${royalty}`,
      ).then((res) => {
        return res.json().catch(() => null) as any;
      });
      if (!!proxiedData) return proxiedData;
      const game = await this.prisma.game.findFirst({
        where: { contractAddress: address, chainId: network },
      });
      if (!game) throw new NotFoundException();
      return {
        name: game.name,
        description: game.name,
        fee_recipient: address,
        seller_fee_basis_points: royalty,
        image: game.name,
      };
    },
  );
}
