import { BadRequestException, Injectable } from "@nestjs/common";
import { COLOR, MAP_ITEMS, NFT_JOB } from "@prisma/client";
import { endpoints } from "api-interface";
import { createAsyncService, createService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}
  getColors = createService<typeof endpoints.map.getColors>(() => {
    return Object.keys(COLOR);
  });
  getNftJobs = createService<typeof endpoints.map.getNftJobs>(() => {
    return Object.keys(NFT_JOB);
  });
  getMapItems = createService<typeof endpoints.map.getMapItems>(() => {
    return Object.keys(MAP_ITEMS);
  });

  getPositions = createAsyncService<typeof endpoints.map.getPositions>(
    async ({ query: { skip, take, color, gameId } }) => {
      const data = await this.prisma.mapPosition.findMany({
        where: { gameId, color: COLOR[color] },
        include: { nfts: { include: { nftMetadata: true } } },
        skip,
        take,
        orderBy: [
          {
            x: "asc",
          },
          {
            y: "asc",
          },
        ],
      });
      return data;
    },
  );

  assignItemToPosition = createAsyncService<
    typeof endpoints.map.assignItemToPosition
  >(async ({ body: { color, gameId, x, y, mapItem, prePlaced } }) => {
    if (!!mapItem && !!prePlaced)
      throw new BadRequestException(
        `Cannot assign both ${mapItem} and ${prePlaced} at same place`,
      );
    const payload = !!mapItem
      ? { mapItem: MAP_ITEMS[mapItem], prePlaced: null }
      : !!prePlaced
      ? { prePlaced: NFT_JOB[prePlaced], mapItem: null }
      : {};
    await this.prisma.mapPosition.upsert({
      where: { x_y_gameId_color: { color: COLOR[color], gameId, x, y } },
      create: {
        color: COLOR[color],
        x,
        y,
        gameId,
        ...payload,
      },
      update: { color: COLOR[color], x, y, gameId, ...payload },
    });
    return "success";
  });

  removeItem = createAsyncService<typeof endpoints.map.removeItem>(
    async ({ param: { id } }) => {
      await this.prisma.mapPosition.delete({ where: { id } });
      return "success";
    },
  );
}
