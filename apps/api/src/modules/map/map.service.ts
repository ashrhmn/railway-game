import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  COLOR,
  GAME_STATUS,
  MAP_ITEMS,
  NFT_JOB,
  RAIL_DIRECTION,
} from "@prisma/client";
import { endpoints, WS_EVENTS } from "api-interface";
import { createAsyncService, createService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import { CONFIG } from "src/config/app.config";
import { ethers } from "ethers";
import { Position } from "src/classes/Position";
import { timestamp } from "src/utils/date.utils";
import { SETTINGS_KEY } from "src/enums/settings-key.enum";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}
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
      const data = await this.prisma.mapPosition.findMany({
        where: {
          gameId,
          color: COLOR[color],
          ...(!!user && user.roles.includes("ADMIN")
            ? {}
            : { isRevealed: true }),
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
        const position = await tx.mapPosition.findUnique({ where: { id } });
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
              color: COLOR[color],
              gameId,
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
              color: COLOR[color],
              gameId,
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
              color: COLOR[color],
              gameId,
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
              color: COLOR[color],
              gameId,
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
    async ({
      body: {
        color,
        gameId,
        nftId,
        x,
        y,
        walletAddress,
        additionalLightUpPositions,
      },
    }) => {
      const eventParams: Parameters<typeof WS_EVENTS.MAP_POSITIONS_UPDATED>[] =
        [];
      const res = await this.prisma.$transaction(async (tx) => {
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
          throw new BadRequestException(
            `Invalid contract chainId : ${game.chainId}`,
          );

        const nft = await tx.nft.findUnique({ where: { id: nftId } });
        if (!nft) throw new NotFoundException(`NFT with id ${nftId} not found`);
        if (nft.frozenTill > timestamp())
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
          throw new BadRequestException(`NFT with id ${nftId} is not ${color}`);

        const mapPosition = await tx.mapPosition.findUnique({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          select: {
            enemy: true,
            mapItem: true,
            isRevealed: true,
            bridgeConstructedOn: true,
            id: true,
          },
        });

        if (nft.job === "LIGHT") {
          const positionsToReveal = [
            { x, y },
            ...(additionalLightUpPositions || []),
          ];

          if (positionsToReveal.length > nft.abilityL)
            throw new BadRequestException(
              `NFT with id ${nftId}(${nft.job}) can only light up ${nft.abilityL} positions, but ${positionsToReveal.length} positions requested`,
            );

          if (
            positionsToReveal.some(
              (ptr) => Math.abs(ptr.x - x) > 1 || Math.abs(ptr.y - y) > 1,
            )
          )
            throw new BadRequestException(
              `Additional Positions are not adjacent to root position`,
            );

          for (const { x, y } of positionsToReveal) {
            await tx.mapPosition.upsert({
              where: { x_y_gameId_color: { x, y, gameId, color } },
              create: { x, y, color, gameId, isRevealed: true },
              update: { isRevealed: true },
            });
          }
          eventParams.push([
            { color, gameId },
            { x, y, job: "LIGHT", additionalLightUpPositions },
          ]);

          const lightNftFrozenTime = await tx.settings.findUnique({
            where: { key: SETTINGS_KEY.LIGHT_NFT_LOCKING_TIME },
            select: { numValue: true },
          });

          if (!lightNftFrozenTime || !lightNftFrozenTime.numValue)
            throw new BadRequestException(`Light NFT Frozen Time not set`);

          const frozenTill = timestamp() + lightNftFrozenTime.numValue;

          await tx.nft.update({
            where: { id: nft.id },
            data: { frozenTill },
          });

          eventParams.push([
            { color, gameId },
            {
              x,
              y,
              job: nft.job,
              message: "LIGHT_NFT_FROZEN",
              frozenTill,
            },
          ]);
        } else {
          if (!mapPosition)
            throw new NotFoundException(`Map Position not revealed yet`);

          if (!mapPosition.isRevealed)
            throw new BadRequestException(`Map Position not revealed yet`);

          if (!!mapPosition.mapItem && mapPosition.mapItem === "MOUNTAIN")
            throw new BadRequestException(`No NFT can be placed on a mountain`);

          if (
            !!mapPosition.mapItem &&
            mapPosition.mapItem === "RIVER" &&
            mapPosition.bridgeConstructedOn < timestamp() &&
            nft.job !== "BRIDGE"
          )
            throw new BadRequestException(
              `NFT with id ${nftId}(${nft.job}) cannot be placed on river. Only bridge nft can be placed on a river`,
            );

          if (
            !!mapPosition.enemy &&
            mapPosition.enemy.currentStrength > 0 &&
            nft.job !== "KNIGHT"
          )
            throw new BadRequestException(
              `NFT with id ${nftId}(${nft.job}) cannot be placed on an undefeated enemy. Only knight nft can be used on an undefeated enemy to defeat it`,
            );

          if (nft.job === "BRIDGE") {
            if (mapPosition.mapItem !== "RIVER")
              throw new BadRequestException(
                `NFT with id ${nftId}(${nft.job}) can only be placed on river`,
              );

            if (mapPosition.bridgeConstructedOn < timestamp())
              throw new BadRequestException(
                `A bridge is already constructed on this river`,
              );

            const bridgeConstructionBaseTime = await tx.settings.findUnique({
              where: { key: SETTINGS_KEY.BRIDGE_CONSTRUCTION_TIME },
              select: { numValue: true },
            });

            if (
              !bridgeConstructionBaseTime ||
              !bridgeConstructionBaseTime.numValue
            )
              throw new BadRequestException(`Bridge Construction Time not set`);

            const bridgeConstructionTime = Math.round(
              bridgeConstructionBaseTime.numValue - (100 - nft.abilityB) / 100,
            );

            const bridgeConstructedOn = timestamp() + bridgeConstructionTime;

            await tx.mapPosition.update({
              where: { id: mapPosition.id },
              data: { bridgeConstructedOn },
            });

            eventParams.push([
              { color, gameId },
              { x, y, bridgeConstructedOn, job: "BRIDGE" },
            ]);

            // this.emit(
            //   WS_EVENTS.MAP_POSITIONS_UPDATED(
            //     { color, gameId },
            //     { x, y, bridgeConstructedOn, job: "BRIDGE" },
            //   ),
            // );
          }

          if (nft.job === "KNIGHT") {
            if (!mapPosition.enemy)
              throw new BadRequestException(
                `Knight NFT can only be placed on an enemy`,
              );

            if (mapPosition.enemy.currentStrength <= 0)
              throw new BadRequestException(
                `Knight NFT can only be placed on an undefeated enemy. Enemy with id ${mapPosition.enemy.id} is already defeated`,
              );

            const decrement = Math.min(
              mapPosition.enemy.currentStrength,
              nft.abilityK,
            );

            await tx.enemy.update({
              where: { id: mapPosition.enemy.id },
              data: { currentStrength: { decrement } },
            });
            eventParams.push([
              { color, gameId },
              {
                x,
                y,
                job: "KNIGHT",
                message: "ENEMY_STRENGTH_DECREMENTED",
                decrement,
              },
            ]);
            // this.emit(
            //   WS_EVENTS.MAP_POSITIONS_UPDATED(
            //     { color, gameId },
            //     {
            //       x,
            //       y,
            //       job: "KNIGHT",
            //       message: "ENEMY_STRENGTH_DECREMENTED",
            //       decrement,
            //     },
            //   ),
            // );
          }

          if (
            Object.keys(NFT_JOB)
              .filter((v) => v.startsWith("RAIL_"))
              .includes(nft.job)
          ) {
            const currentRailPosition = await tx.railPosition.findFirst({
              where: { color: color, gameId: gameId },
              orderBy: { createdAt: "desc" },
            });

            if (!currentRailPosition)
              throw new BadRequestException(
                "Current position for rail not found",
              );

            if (currentRailPosition.x === x && currentRailPosition.y === y)
              throw new BadRequestException(
                `Rail NFT can not be placed on the same position as current rail position`,
              );

            const railRoadConstructionBaseTime = await tx.settings.findUnique({
              where: { key: SETTINGS_KEY.RAIL_ROAD_CONSTRUCTION_TIME },
              select: { numValue: true },
            });

            if (
              !railRoadConstructionBaseTime ||
              !railRoadConstructionBaseTime.numValue
            )
              throw new BadRequestException(
                `Rail Road Construction Time not set`,
              );

            const railRoadConstructionTime = Math.round(
              railRoadConstructionBaseTime.numValue *
                ((100 - nft.abilityR) / 100),
            );

            const railConstructedOn = timestamp() + railRoadConstructionTime;

            await tx.mapPosition.upsert({
              where: { x_y_gameId_color: { x, y, gameId, color } },
              create: {
                x,
                y,
                color,
                gameId,
                railConstructedOn,
              },
              update: {
                railConstructedOn,
              },
            });

            eventParams.push([
              { color, gameId },
              { x, y, job: nft.job, railConstructedOn },
            ]);
          }
          const nftFrozenTime = await tx.settings.findUnique({
            where: { key: SETTINGS_KEY.NFT_LOCK_TIME },
            select: { numValue: true },
          });

          if (!nftFrozenTime || !nftFrozenTime.numValue)
            throw new BadRequestException(`NFT Frozen Time not set`);

          const frozenTill = timestamp() + nftFrozenTime.numValue;

          await tx.nft.update({
            where: { id: nft.id },
            data: { frozenTill },
          });

          eventParams.push([
            { color, gameId },
            {
              x,
              y,
              job: nft.job,
              message: "NFT_FROZEN",
              frozenTill,
            },
          ]);
        }

        await tx.mapPosition.upsert({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          create: { color, gameId, x, y, nftId },
          update: { nftId, color, gameId, x, y },
        });
        return "placed";
      });

      eventParams.forEach((params) => {
        this.emit(WS_EVENTS.MAP_POSITIONS_UPDATED(...params));
      });

      return res;
    },
  );

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAndMoveRail() {
    console.log("checkAndMoveRail");
    const runningGames = await this.prisma.game.findMany({
      where: { status: "RUNNING" },
    });
    runningGames.forEach((game) =>
      Object.keys(COLOR).forEach((color) =>
        this.checkAndMoveRailByGameIdAndColor(game.id, color as COLOR),
      ),
    );
  }

  async checkAndMoveRailByGameIdAndColor(gameId: string, color: COLOR) {
    const currentRailPosition = await this.prisma.railPosition.findFirst({
      where: { gameId, color },
      orderBy: { createdAt: "desc" },
    });

    if (!currentRailPosition) {
      console.warn(
        `Current Rail Position not found for game: ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      return;
    }

    const railMovementLockTime = await this.prisma.settings.findUnique({
      where: { key: SETTINGS_KEY.RAIL_MOVEMENT_LOCK_TIME },
      select: { numValue: true },
    });

    if (!railMovementLockTime || !railMovementLockTime.numValue) {
      console.info(`Rail movement lock time is not set`);
      return;
    }

    if (
      Math.round(currentRailPosition.createdAt.valueOf() / 1000) >
      timestamp() - railMovementLockTime.numValue
    ) {
      console.info(
        `Rail is not ready to move yet for game: ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      return;
    }

    const { x: xCurr, y: yCurr } = currentRailPosition;

    const currentPosition = new Position(
      currentRailPosition.x,
      currentRailPosition.y,
    );

    const direction = currentRailPosition.direction;

    const nextPosition =
      direction === "DOWN"
        ? currentPosition.down()
        : direction === "UP"
        ? currentPosition.up()
        : direction === "LEFT"
        ? currentPosition.left()
        : direction === "RIGHT"
        ? currentPosition.right()
        : null;

    const oppositeDirection =
      direction === "DOWN"
        ? RAIL_DIRECTION.UP
        : direction === "UP"
        ? RAIL_DIRECTION.DOWN
        : direction === "LEFT"
        ? RAIL_DIRECTION.RIGHT
        : direction === "RIGHT"
        ? RAIL_DIRECTION.LEFT
        : null;

    if (!nextPosition || !oppositeDirection) {
      console.warn(
        `Invalid Rail Direction: ${JSON.stringify({ gameId, color }, null, 2)}`,
      );
      return;
    }

    const { x, y } = nextPosition.getPosition();
    if (x < 0 || y < 0 || x > 14 || y > 14) {
      console.log(
        `Colided with outer box, turning 180 degree ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      await this.prisma.railPosition.create({
        data: {
          color,
          gameId,
          direction: oppositeDirection,
          x: currentRailPosition.x,
          y: currentRailPosition.y,
        },
      });
      return await this.onPositionChange(
        color,
        gameId,
        xCurr,
        yCurr,
        oppositeDirection,
        null,
      );
    }

    const nextMapPosition = await this.prisma.mapPosition.findUnique({
      where: { x_y_gameId_color: { x, y, gameId, color } },
      include: { enemy: true, game: true, nft: true },
    });

    if (!nextMapPosition) {
      console.warn(
        `Next Rail Position ${{
          x,
          y,
        }} not found for game: ${gameId}, color: ${color}`,
      );
      return;
    }

    if (nextMapPosition.mapItem === "MOUNTAIN") {
      console.log(
        `Colided with mountain, turning 180 degree ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      await this.prisma.railPosition.create({
        data: {
          color,
          gameId,
          direction: oppositeDirection,
          x: currentRailPosition.x,
          y: currentRailPosition.y,
        },
      });
      return await this.onPositionChange(
        color,
        gameId,
        xCurr,
        yCurr,
        oppositeDirection,
        null,
      );
    }

    if (
      nextMapPosition.mapItem === "RIVER" &&
      (nextMapPosition.bridgeConstructedOn > timestamp() ||
        nextMapPosition.bridgeConstructedOn === 0)
    ) {
      console.log(
        `Colided with river with no bridge constructed, turning 180 degree ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      await this.prisma.railPosition.create({
        data: {
          color,
          gameId,
          direction: oppositeDirection,
          x: currentRailPosition.x,
          y: currentRailPosition.y,
        },
      });
      return await this.onPositionChange(
        color,
        gameId,
        xCurr,
        yCurr,
        oppositeDirection,
        null,
      );
    }

    if (!!nextMapPosition.enemy && nextMapPosition.enemy.currentStrength > 0) {
      console.log(
        `Colided with undefeated enemy, turning 180 degree ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      await this.prisma.railPosition.create({
        data: {
          color,
          gameId,
          direction: oppositeDirection,
          x: currentRailPosition.x,
          y: currentRailPosition.y,
        },
      });
      return await this.onPositionChange(
        color,
        gameId,
        xCurr,
        yCurr,
        oppositeDirection,
        null,
      );
    }

    if (!nextMapPosition.nft) {
      console.log(
        `No nft placed forward, rail stays on the same position ${JSON.stringify(
          { gameId, color },
          null,
          2,
        )}`,
      );
      return;
    }

    if (
      nextMapPosition.railConstructedOn > timestamp() ||
      nextMapPosition.railConstructedOn === 0
    ) {
      console.log(
        `No rail constructed forward, rail stays on the same position ${JSON.stringify(
          {
            gameId,
            color,
            constructionCompletesOn: new Date(
              nextMapPosition.railConstructedOn * 1000,
            ),
          },
          null,
          2,
        )}`,
      );
      return;
    }

    if (direction === "LEFT") {
      if (
        nextMapPosition.nft.job === "RAIL_4_6" ||
        nextMapPosition.nft.job === "RAIL_2_4_6_8"
      ) {
        console.log(`Going left ${JSON.stringify({ gameId, color }, null, 2)}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "LEFT",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_2_6") {
        console.log(
          `Going left,turning down ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_6_8") {
        console.log(
          `Going left, turning up ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "UP",
          nextMapPosition.mapItem,
        );
      }
      console.log(
        "Attempt left, but nft job mismatch",
        nextMapPosition.nft.job,
        " on ",
        x,
        y,
        gameId,
        color,
      );
      return;
    }

    if (direction === "RIGHT") {
      if (
        nextMapPosition.nft.job === "RAIL_4_6" ||
        nextMapPosition.nft.job === "RAIL_2_4_6_8"
      ) {
        console.log(
          `Going right ${JSON.stringify({ gameId, color }, null, 2)}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_2_4") {
        console.log(
          `Going right, turning down ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_4_8") {
        console.log(
          `Going right, turning up ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "UP",
          nextMapPosition.mapItem,
        );
      }
      console.log(
        "Attempt right, but nft job mismatch",
        nextMapPosition.nft.job,
        " on ",
        x,
        y,
        gameId,
        color,
      );
      return;
    }

    if (direction === "UP") {
      if (
        nextMapPosition.nft.job === "RAIL_2_8" ||
        nextMapPosition.nft.job === "RAIL_2_4_6_8"
      ) {
        console.log(`Going up ${JSON.stringify({ gameId, color }, null, 2)}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "UP",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_2_6") {
        console.log(
          `Going up, turning right ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_2_4") {
        console.log(
          `Going up, turning left ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "LEFT",
          nextMapPosition.mapItem,
        );
      }
      console.log(
        "Attempt up, but nft job mismatch",
        nextMapPosition.nft.job,
        " on ",
        x,
        y,
        gameId,
        color,
      );
      return;
    }

    if (direction === "DOWN") {
      if (
        nextMapPosition.nft.job === "RAIL_2_8" ||
        nextMapPosition.nft.job === "RAIL_2_4_6_8"
      ) {
        console.log(`Going down ${JSON.stringify({ gameId, color }, null, 2)}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_6_8") {
        console.log(
          `Going down, turning right ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextMapPosition.nft.job === "RAIL_4_8") {
        console.log(
          `Going down, turning left ${JSON.stringify(
            { gameId, color },
            null,
            2,
          )}`,
        );
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "LEFT",
          nextMapPosition.mapItem,
        );
      }
      console.log(
        "Attempt down, but nft job mismatch",
        nextMapPosition.nft.job,
        " on ",
        x,
        y,
        gameId,
        color,
      );
      return;
    }
  }

  async onPositionChange(
    color: COLOR,
    gameId: string,
    x: number,
    y: number,
    direction: RAIL_DIRECTION,
    mapItem: MAP_ITEMS | null,
  ) {
    const eventParams: Parameters<typeof WS_EVENTS.MAP_POSITIONS_UPDATED>[] =
      [];
    const res = await this.prisma.$transaction(async (tx) => {
      await tx.railPosition.create({
        data: { color, gameId, direction, x, y },
      });
      if (mapItem === "CHECKPOINT") {
        await tx.mapPosition.update({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          data: { checkPointPassed: true },
        });
        eventParams.push([
          { gameId, color },
          { x, y, message: "CHECKPOINT_PASSED" },
        ]);
      }
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
      eventParams.push([
        { color, gameId },
        { x, y, message: "POSITIONS_REVEALED", positions: positionsToReveal },
      ]);
    });
    eventParams.forEach((params) => {
      this.emit(WS_EVENTS.MAP_POSITIONS_UPDATED(...params));
    });
    this.emit(
      WS_EVENTS.RAIL_POSITION_CHANGED({ color, gameId }, { x, y, direction }),
    );
    if (x === 0 && y === 0) this.checkWinner(color, gameId, x, y);
    return res;
  }

  async checkWinner(color: COLOR, gameId: string, x: number, y: number) {
    if (x !== 0 || y !== 0) return;
    const unpassedCheckPoints = await this.prisma.mapPosition.count({
      where: { mapItem: "CHECKPOINT", checkPointPassed: false, gameId, color },
    });

    if (unpassedCheckPoints > 0) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: gameId },
        data: { status: GAME_STATUS.FINISHED, winnerTeam: color as COLOR },
      });
      await tx.nft.updateMany({
        data: { level: { increment: 1 } },
        where: { gameId, color: color as COLOR },
      });
      // const nfts = await tx.nft.findMany({
      //   where: { gameId },
      //   select: { id: true },
      // });
      // TODO: update BLKR values
      // (async () => {
      //   for (const { id } of nfts) {
      //     const job =
      //       Object.keys(NFT_JOB)[
      //         getRandomNumber(0, Object.keys(NFT_JOB).length - 1)
      //       ];
      //     const color =
      //       Object.keys(COLOR)[
      //         getRandomNumber(0, Object.keys(COLOR).length - 1)
      //       ];
      //     if (!job || !color) throw new Error("Invalid random job or color");
      //     await tx.nft.update({
      //       where: { id },
      //       data: { job: job as NFT_JOB, color: color as COLOR },
      //     });
      //   }
      // })();
    });

    this.emit(WS_EVENTS.GAME_FINISHED({ gameId }, { color }));
  }

  emit({ event, payload }: { event: string; payload: any }) {
    this.socketService.socket?.emit(event, payload);
  }

  // updateRailLocation = createAsyncService<
  //   typeof endpoints.map.updateRailLocation
  // >(async ({ body: { color, gameId, x, y } }) => {
  //   return await this.prisma.$transaction(async (tx) => {
  //     const game = await tx.game.findUnique({
  //       where: { id: gameId },
  //       select: { status: true, contractAddress: true },
  //     });
  //     if (!game)
  //       throw new NotFoundException(`Game with id ${gameId} not found`);
  //     if (game.status !== GAME_STATUS.RUNNING)
  //       throw new BadRequestException(`Game is not running`);

  //     const mapPosition = await tx.mapPosition.findUnique({
  //       where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
  //       include: { enemy: true },
  //     });

  //     if (!mapPosition)
  //       throw new NotFoundException(`Map Position not revealed yet`);

  //     if (!mapPosition.isRevealed)
  //       throw new BadRequestException(`Map Position not revealed yet`);

  //     if (mapPosition.mapItem === "MOUNTAIN")
  //       throw new BadRequestException(`Can not travel on a maountain`);

  //     if (
  //       mapPosition.mapItem === "RIVER" &&
  //       mapPosition.bridgeConstructedOn > timestamp()
  //     )
  //       throw new BadRequestException(
  //         `Can not travel on a river with no bridge constructed on it`,
  //       );

  //     if (!!mapPosition.enemy && mapPosition.enemy.currentStrength > 0)
  //       throw new BadRequestException(`Can not travel on an undefeated enemy`);

  //     const currentRailPosition = await tx.railPosition.findFirst({
  //       where: { color: color as COLOR, gameId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     if (!currentRailPosition)
  //       throw new BadRequestException(`No Rail NFT placed`);

  //     if (
  //       Math.round(currentRailPosition.createdAt.valueOf() / 1000) >
  //       timestamp() - 10 * 60 // 10 minutes
  //     )
  //       throw new BadRequestException(
  //         `Can not move rail before 10 minutes of last movement`,
  //       );

  //     if (
  //       Math.abs(currentRailPosition.x - x) > 1 ||
  //       Math.abs(currentRailPosition.y - y) > 1
  //     )
  //       throw new BadRequestException(
  //         `Can not travel more than 1 square at a time`,
  //       );

  //     // if (!!mapPosition.mapItem && mapPosition.mapItem !== MAP_ITEMS.CHECKPOINT)
  //     //   throw new BadRequestException(
  //     //     `Map Position already occupied by ${mapPosition.mapItem}`,
  //     //   );

  //     // if (!!mapPosition.enemyId)
  //     //   throw new BadRequestException(`Map Position already occupied by enemy`);

  //     // if (!mapPosition.nftId)
  //     //   throw new BadRequestException(
  //     //     `No Rail NFT placed on the specified position`,
  //     //   );

  //     await tx.railPosition.create({
  //       data: { x, y, color: color as COLOR, gameId, direction: "LEFT" },
  //     });

  //     if (mapPosition.mapItem === MAP_ITEMS.CHECKPOINT)
  //       await tx.mapPosition.upsert({
  //         where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
  //         update: { checkPointPassed: true },
  //         create: {
  //           color: color as COLOR,
  //           x,
  //           y,
  //           gameId,
  //           checkPointPassed: true,
  //         },
  //       });

  //     const root = new Position(x, y);

  //     const positionsToReveal = [
  //       root,
  //       //  adjacents
  //       root.left(),
  //       root.right(),
  //       root.up(),
  //       root.down(),
  //       root.up().left(),
  //       root.up().right(),
  //       root.down().left(),
  //       root.down().right(),
  //       //  2 square away left
  //       root.left().left(),
  //       root.left().left().up(),
  //       root.left().left().down(),
  //       //  2 square away up
  //       root.up().up(),
  //       root.up().up().left(),
  //       root.up().up().right(),
  //       //  2 square away right
  //       root.right().right(),
  //       root.right().right().up(),
  //       root.right().right().down(),
  //       //  2 square away down
  //       root.down().down(),
  //       root.down().down().left(),
  //       root.down().down().right(),
  //     ]
  //       .map((pos) => pos.getPosition())
  //       .filter(
  //         (pos) => pos.x >= 0 && pos.y >= 0 && pos.x <= 14 && pos.y <= 14,
  //       );

  //     for (const { x, y } of positionsToReveal) {
  //       await tx.mapPosition.upsert({
  //         where: { x_y_gameId_color: { x, y, gameId, color: color as COLOR } },
  //         create: { x, y, color: color as COLOR, gameId, isRevealed: true },
  //         update: { x, y, color: color as COLOR, gameId, isRevealed: true },
  //       });
  //     }
  //     if (x === 14 && y === 14) {
  //       await tx.game.update({
  //         where: { id: gameId },
  //         data: { status: GAME_STATUS.FINISHED, winnerTeam: color as COLOR },
  //       });
  //       await tx.nft.updateMany({
  //         data: { level: { increment: 1 } },
  //         where: { gameId, color: color as COLOR },
  //       });
  //       const nfts = await tx.nft.findMany({
  //         where: { gameId },
  //         select: { id: true },
  //       });
  //       // TODO: update BLKR values
  //       (async () => {
  //         for (const { id } of nfts) {
  //           const job =
  //             Object.keys(NFT_JOB)[
  //               getRandomNumber(0, Object.keys(NFT_JOB).length - 1)
  //             ];
  //           const color =
  //             Object.keys(COLOR)[
  //               getRandomNumber(0, Object.keys(COLOR).length - 1)
  //             ];
  //           if (!job || !color) throw new Error("Invalid random job or color");
  //           await tx.nft.update({
  //             where: { id },
  //             data: { job: job as NFT_JOB, color: color as COLOR },
  //           });
  //         }
  //       })();
  //     }
  //     return "updated";
  //   });
  // });
}
