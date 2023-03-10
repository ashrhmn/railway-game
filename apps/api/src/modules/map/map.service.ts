import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { COLOR, GAME_STATUS, MAP_ITEMS, NFT_JOB } from "@prisma/client";
import { endpoints } from "api-interface";
import { createAsyncService, createService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import { CONFIG } from "src/config/app.config";
import { ethers } from "ethers";
import Sample721Artifact from "../../ABIs/Sample721.json";
import { Position } from "src/classes/Position";

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
    async ({ query: { skip, take, color, gameId } }, { user }) => {
      if (!user) throw new HttpException("Unauthorized", 401);
      const data = await this.prisma.mapPosition.findMany({
        where: {
          gameId,
          color: COLOR[color],
          ...(user.roles.includes("GAMEDEV") ? { isRevealed: true } : {}),
        },
        include: {
          nft: true,
          enemy: { include: { _count: { select: { positions: true } } } },
        },
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

    if (!!payload.mapItem && payload.mapItem === MAP_ITEMS.MOUNTAIN) {
      const count = await this.prisma.mapPosition.count({
        where: {
          x,
          y,
          color: COLOR[color],
          gameId,
          enemyId: { not: null },
        },
      });

      if (count > 0) {
        throw new BadRequestException(
          `Cannot place ${mapItem} on enemy position`,
        );
      }
    }
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
      return this.prisma.$transaction(async (tx) => {
        const position = await tx.mapPosition.findFirst({ where: { id } });
        await tx.mapPosition.delete({ where: { id } });
        if (position?.enemyId)
          await tx.mapPosition.deleteMany({
            where: { enemyId: position.enemyId },
          });
        await tx.enemy.deleteMany({
          where: { positions: { none: { enemyId: { not: null } } } },
        });
        return "success";
      });
    },
  );

  assignEnemyToPosition = createAsyncService<
    typeof endpoints.map.assignEnemyToPosition
  >(async ({ body: { color, gameId, x, y, strength, name } }) => {
    const mountainCount = await this.prisma.mapPosition.count({
      where: { x, y, color: COLOR[color], gameId, mapItem: MAP_ITEMS.MOUNTAIN },
    });
    if (mountainCount > 0)
      throw new BadRequestException(`Cannot place enemy on mountain`);
    const enemyCount = await this.prisma.mapPosition.count({
      where: { x, y, color: COLOR[color], gameId, enemyId: { not: null } },
    });
    if (enemyCount > 0)
      throw new BadRequestException(`Cannot place enemy on enemy`);
    await this.prisma.enemy.create({
      data: {
        name,
        strength,
        currentStrength: strength,
        positions: {
          connectOrCreate: {
            where: { x_y_gameId_color: { color: COLOR[color], gameId, x, y } },
            create: { color: COLOR[color], x, y, gameId },
          },
        },
      },
    });
    return "success";
  });

  expandEnemySize = createAsyncService<typeof endpoints.map.expandEnemySize>(
    async ({ body: { direction, enemyId } }) => {
      const enemy = await this.prisma.enemy.findUnique({
        where: { id: enemyId },
        include: { positions: true },
      });
      if (!enemy)
        throw new NotFoundException(`Enemy with id ${enemyId} not found`);
      if (enemy.positions.length < 1)
        throw new BadRequestException(
          `Invalid enemy configuration. Try removing and adding enemy again`,
        );

      const color = enemy.positions[0].color;
      const gameId = enemy.positions[0].gameId;
      if (typeof gameId !== "string")
        throw new BadRequestException(`Invalid game id`);
      if (typeof color !== "string" || !Object.keys(COLOR).includes(color))
        throw new BadRequestException(`Invalid color`);
      const maxY = Math.max(...enemy.positions.map((p) => p.y));
      const minY = Math.min(...enemy.positions.map((p) => p.y));
      const maxX = Math.max(...enemy.positions.map((p) => p.x));
      const minX = Math.min(...enemy.positions.map((p) => p.x));
      if (enemy.positions.length === 1) {
        if (direction === "L" || direction === "R")
          throw new BadRequestException(
            `Enemy size 4 can only be expanded to 6`,
          );

        if (
          (maxX === 14 && ["TR", "BR"].includes(direction)) ||
          (minX === 0 && ["TL", "BL"].includes(direction)) ||
          (minY === 0 && ["BR", "BL"].includes(direction)) ||
          (maxY === 14 && ["TR", "TL"].includes(direction))
        )
          throw new BadRequestException(
            `Cannot expand enemy size beyond the boundary`,
          );

        const positions = {
          TR: [
            { x: maxX + 1, y: maxY + 1 },
            { x: maxX + 1, y: maxY },
            { x: maxX, y: maxY + 1 },
          ],
          TL: [
            { x: maxX - 1, y: maxY + 1 },
            { x: maxX - 1, y: maxY },
            { x: maxX, y: maxY + 1 },
          ],
          BR: [
            { x: maxX + 1, y: maxY - 1 },
            { x: maxX + 1, y: maxY },
            { x: maxX, y: maxY - 1 },
          ],
          BL: [
            { x: maxX - 1, y: maxY - 1 },
            { x: maxX - 1, y: maxY },
            { x: maxX, y: maxY - 1 },
          ],
        }[direction];

        const existingMountainCount = await this.prisma.mapPosition.count({
          where: {
            OR: positions.map(({ x, y }) => ({
              x,
              y,
              mapItem: MAP_ITEMS.MOUNTAIN,
            })),
          },
        });

        if (existingMountainCount > 0)
          throw new BadRequestException(
            `Cannot expand enemy size. Clashes with a mountain`,
          );

        const existingEnemyCount = await this.prisma.mapPosition.count({
          where: {
            OR: positions.map(({ x, y }) => ({
              x,
              y,
              enemyId: { not: null },
            })),
          },
        });

        if (existingEnemyCount > 0)
          throw new BadRequestException(
            `Cannot expand enemy size. Clashes with another enemy`,
          );
        await Promise.all(
          positions.map(({ x, y }) =>
            this.prisma.mapPosition.upsert({
              where: { x_y_gameId_color: { x, y, gameId, color } },
              create: { x, y, color, gameId, enemyId },
              update: { enemyId },
            }),
          ),
        );
        return "Success";
      }
      if (enemy.positions.length === 4) {
        if (
          direction === "TR" ||
          direction === "BL" ||
          direction === "BR" ||
          direction === "TL"
        )
          throw new BadRequestException(
            `Enemy size 1 can only be expanded to 4`,
          );

        if (
          (maxX === 14 && direction === "R") ||
          (minX === 0 && direction === "L")
        )
          throw new BadRequestException(
            `Cannot expand enemy size beyond the boundary`,
          );
        const positions = {
          R: [
            { x: maxX + 1, y: maxY },
            { x: maxX + 1, y: minY },
          ],
          L: [
            { x: minX - 1, y: maxY },
            { x: minX - 1, y: minY },
          ],
        }[direction];
        const existingMountainCount = await this.prisma.mapPosition.count({
          where: {
            OR: positions.map(({ x, y }) => ({
              x,
              y,
              mapItem: MAP_ITEMS.MOUNTAIN,
            })),
          },
        });

        if (existingMountainCount > 0)
          throw new BadRequestException(
            `Cannot expand enemy size. Clashes with a mountain`,
          );

        const existingEnemyCount = await this.prisma.mapPosition.count({
          where: {
            OR: positions.map(({ x, y }) => ({
              x,
              y,
              enemyId: { not: null },
            })),
          },
        });

        if (existingEnemyCount > 0)
          throw new BadRequestException(
            `Cannot expand enemy size. Clashes with another enemy`,
          );
        await Promise.all(
          positions.map(({ x, y }) =>
            this.prisma.mapPosition.upsert({
              where: { x_y_gameId_color: { x, y, gameId, color } },
              create: { x, y, color, gameId, enemyId },
              update: { enemyId },
            }),
          ),
        );
        return "Success";
      }
      throw new BadRequestException(
        `Invalid Enemy Config, Try removing enemy and add it again`,
      );
    },
  );

  placeNftOnMap = createAsyncService<typeof endpoints.map.placeNftOnMap>(
    async ({ body: { color, gameId, nftId, x, y, walletAddress } }) => {
      return this.prisma.$transaction(async (tx) => {
        const game = await tx.game.findUnique({
          where: { id: gameId },
        });
        if (!game)
          throw new NotFoundException(`Game with id ${gameId} not found`);
        if (game.status !== GAME_STATUS.RUNNING)
          throw new BadRequestException(`Game is not running`);
        if (!game.contractAddress)
          throw new BadRequestException(
            `Game not deployed, (Invalid Contract Address)`,
          );

        if (!game.chainId || isNaN(game.chainId))
          throw new BadRequestException(`Invalid chainId ${game.chainId}`);

        const nft = await tx.nft.findUnique({ where: { id: nftId } });
        if (!nft) throw new NotFoundException(`NFT with id ${nftId} not found`);
        if (nft.isFrozen)
          throw new BadRequestException(`NFT with id ${nftId} is frozen`);

        const contract = new ethers.Contract(
          game.contractAddress,
          CONFIG.ABI.SAMPLE721,
          CONFIG.PROVIDER(game.chainId),
        );

        const owner = await contract.ownerOf(nft.tokenId);
        if (owner.toLowerCase() !== walletAddress.toLowerCase())
          throw new BadRequestException(
            `NFT with id ${nftId} does not belong to wallet address ${walletAddress}`,
          );

        if (nft.gameId !== gameId)
          throw new BadRequestException(
            `NFT with id ${nftId} does not belong to game with id ${gameId}`,
          );
        if (nft.color !== color)
          throw new BadRequestException(
            `NFT with id ${nftId} does not belong to color ${color}`,
          );

        const mapPosition = await tx.mapPosition.findUnique({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          select: { enemy: true, mapItem: true, isRevealed: true },
        });

        if (!mapPosition)
          throw new NotFoundException(`Map Position not revealed yet`);

        if (!mapPosition.isRevealed)
          throw new BadRequestException(`Map Position not revealed yet`);

        if (
          !!mapPosition.mapItem &&
          mapPosition.mapItem !== MAP_ITEMS.CHECKPOINT
        )
          throw new BadRequestException(
            `Map Position already occupied by ${mapPosition.mapItem}`,
          );

        await tx.mapPosition.upsert({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          create: { color, gameId, x, y, nftId },
          update: { nftId, color, gameId, x, y },
        });
        return "placed";
      });
    },
  );

  updateRailLocation = createAsyncService<
    typeof endpoints.map.updateRailLocation
  >(async ({ body: { color, gameId, x, y } }) => {
    return await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { status: true, contractAddress: true },
      });
      if (!game)
        throw new NotFoundException(`Game with id ${gameId} not found`);
      if (game.status !== GAME_STATUS.RUNNING)
        throw new BadRequestException(`Game is not running`);

      const mapPosition = await tx.mapPosition.findUnique({
        where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
      });

      if (!mapPosition)
        throw new NotFoundException(`Map Position not revealed yet`);

      if (!mapPosition.isRevealed)
        throw new BadRequestException(`Map Position not revealed yet`);

      if (!!mapPosition.mapItem && mapPosition.mapItem !== MAP_ITEMS.CHECKPOINT)
        throw new BadRequestException(
          `Map Position already occupied by ${mapPosition.mapItem}`,
        );

      if (!!mapPosition.enemyId)
        throw new BadRequestException(`Map Position already occupied by enemy`);

      if (!mapPosition.nftId)
        throw new BadRequestException(
          `No Rail NFT placed on the specified position`,
        );

      if (mapPosition.mapItem === MAP_ITEMS.CHECKPOINT)
        await tx.mapPosition.upsert({
          where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
          update: {
            color: color as COLOR,
            x,
            y,
            gameId,
            checkPointPassed: true,
          },
          create: {
            color: color as COLOR,
            x,
            y,
            gameId,
            checkPointPassed: true,
          },
        });

      const root = new Position(x, y);

      const positionsToReveal = [
        root,
        //  adjacents
        root.left(),
        root.right(),
        root.up(),
        root.down(),
        root.up().left(),
        root.up().right(),
        root.down().left(),
        root.down().right(),
        //  2 square away left
        root.left().left(),
        root.left().left().up(),
        root.left().left().down(),

        //  2 square away up
        root.up().up(),
        root.up().up().left(),
        root.up().up().right(),

        //  2 square away right
        root.right().right(),
        root.right().right().up(),
        root.right().right().down(),

        //  2 square away down
        root.down().down(),
        root.down().down().left(),
        root.down().down().right(),
      ]
        .map((pos) => pos.getPosition())
        .filter(
          (pos) => pos.x >= 0 && pos.y >= 0 && pos.x <= 14 && pos.y <= 14,
        );

      for (const { x, y } of positionsToReveal) {
        await tx.mapPosition.upsert({
          where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
          create: { x, y, color: color as COLOR, gameId, isRevealed: true },
          update: { x, y, color: color as COLOR, gameId, isRevealed: true },
        });
      }
      return "updated";
    });
  });
}
