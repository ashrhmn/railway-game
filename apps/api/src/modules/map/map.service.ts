import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  COLOR,
  GAME_STATUS,
  MAP_ITEMS,
  MAP_ITEM_VARIANT,
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
import { CacheService } from "src/providers/cache/cache-manager.service";
import { InjectQueue } from "@nestjs/bull";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { Queue } from "bull";
import { IRailMoveJobData } from "src/providers/jobs/rail-move-job.processor";
import { GameService } from "../game/game.service";

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
    private readonly socketService: SocketService,
    private readonly cacheService: CacheService,
    @InjectQueue(QueueJobEnum.CHECK_AND_MOVE_RAIL_BY_GAME_COLOR)
    private readonly checkAndMoveRailJob: Queue<IRailMoveJobData>,
  ) {}
  getColors = createService<typeof endpoints.map.getColors>(() => {
    return Object.values(COLOR);
  });
  getNftJobs = createService<typeof endpoints.map.getNftJobs>(() => {
    return Object.values(NFT_JOB);
  });
  getMapItems = createService<typeof endpoints.map.getMapItems>(() => {
    return Object.values(MAP_ITEMS);
  });

  getMapItemVariants = createService<typeof endpoints.map.getMapItemVariants>(
    ({ query: { mapItem } }) => {
      if (!mapItem) return Object.values(MAP_ITEM_VARIANT);
      if (!Object.keys(MAP_ITEMS).includes(mapItem))
        throw new BadRequestException(`Invalid map item ${mapItem}`);
      return Object.values(MAP_ITEM_VARIANT).filter((v) =>
        v.startsWith(`${mapItem}_`),
      );
    },
  );

  async getRailMovementLockTime() {
    const railMovementLockTime = await this.cacheService.getIfCached(
      `Settings:RAIL_MOVEMENT_LOCK_TIME`,
      30,
      () =>
        this.prisma.settings.findUnique({
          where: { key: SETTINGS_KEY.RAIL_MOVEMENT_LOCK_TIME },
          select: { numValue: true },
        }),
    );
    if (!railMovementLockTime || !railMovementLockTime.numValue)
      throw new Error("Rail movement lock time not set");

    return railMovementLockTime.numValue;
  }

  getPositions = createAsyncService<typeof endpoints.map.getPositions>(
    async ({ query: { skip, take, color, gameId } }, { user }) => {
      const data = await this.cacheService.getIfCached(
        `getPositions:${JSON.stringify({ skip, take, color, gameId, user })}`,
        1,
        () =>
          this.prisma.mapPosition.findMany({
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
          }),
      );
      return data;
    },
  );

  assignItemToPosition = createAsyncService<
    typeof endpoints.map.assignItemToPosition
  >(
    async ({
      body: { color, gameId, x, y, mapItem, prePlaced, mapItemVariant },
    }) => {
      if (!!mapItem && !!prePlaced)
        throw new BadRequestException(
          `Cannot assign both ${mapItem} and ${prePlaced} at same place`,
        );
      const payload = !!mapItem
        ? {
            mapItem: MAP_ITEMS[mapItem],
            prePlaced: null,
            ...(!!mapItemVariant
              ? { mapItemVariant: MAP_ITEM_VARIANT[mapItemVariant] }
              : { mapItemVariant: null }),
          }
        : !!prePlaced
        ? { prePlaced: NFT_JOB[prePlaced], mapItem: null, mapItemVariant: null }
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
    },
  );

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
    const mountainCount = await this.cacheService.getIfCached(
      `map-positions-count:${JSON.stringify({
        x,
        y,
        color: COLOR[color],
        gameId,
        mapItem: MAP_ITEMS.MOUNTAIN,
      })}`,
      1,
      () =>
        this.prisma.mapPosition.count({
          where: {
            x,
            y,
            color: COLOR[color],
            gameId,
            mapItem: MAP_ITEMS.MOUNTAIN,
          },
        }),
    );
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
      const res = await this.prisma.$transaction(
        async (tx) => {
          const game = await this.cacheService.getIfCached(
            `tx:game:${gameId}`,
            15,
            () =>
              tx.game.findUnique({
                where: { id: gameId },
              }),
          );
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

          const nft = await this.cacheService.getIfCached(
            `tx:nft:${nftId}`,
            15,
            () => tx.nft.findUnique({ where: { id: nftId } }),
          );
          if (!nft)
            throw new NotFoundException(`NFT with id ${nftId} not found`);
          if (nft.frozenTill > timestamp())
            throw new BadRequestException(`NFT with id ${nftId} is frozen`);

          const contract = new ethers.Contract(
            game.contractAddress,
            CONFIG.ABI.SAMPLE721,
            CONFIG.PROVIDER(game.chainId),
          );

          const owner = (await this.cacheService.getIfCached(``, 10, () =>
            contract.ownerOf(nft.tokenId).catch(() => ""),
          )) as any;
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
              `NFT with id ${nftId} is not ${color}`,
            );

          const mapPosition = await this.cacheService.getIfCached(
            `map-positions-unique:${JSON.stringify({
              where: { x_y_gameId_color: { x, y, gameId, color } },
              select: {
                enemy: true,
                mapItem: true,
                isRevealed: true,
                bridgeConstructedOn: true,
                id: true,
              },
            })}`,
            1,
            () =>
              tx.mapPosition.findUnique({
                where: { x_y_gameId_color: { x, y, gameId, color } },
                select: {
                  enemy: true,
                  mapItem: true,
                  isRevealed: true,
                  bridgeConstructedOn: true,
                  id: true,
                },
              }),
          );

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

            const lightNftFrozenTime = await this.cacheService.getIfCached(
              `SETTINGS:LIGHT_NFT_LOCKING_TIME`,
              30,
              () =>
                tx.settings.findUnique({
                  where: { key: SETTINGS_KEY.LIGHT_NFT_LOCKING_TIME },
                  select: { numValue: true },
                }),
            );

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
              throw new BadRequestException(
                `No NFT can be placed on a mountain`,
              );

            if (
              !!mapPosition.mapItem &&
              mapPosition.mapItem === "RIVER" &&
              (mapPosition.bridgeConstructedOn === 0 ||
                mapPosition.bridgeConstructedOn > timestamp()) &&
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

              if (
                mapPosition.bridgeConstructedOn !== 0 &&
                mapPosition.bridgeConstructedOn < timestamp()
              )
                throw new BadRequestException(
                  `A bridge is already constructed on this river`,
                );

              const bridgeConstructionBaseTime =
                await this.cacheService.getIfCached(
                  `SETTINGS:BRIDGE_CONSTRUCTION_TIME`,
                  30,
                  () =>
                    tx.settings.findUnique({
                      where: { key: SETTINGS_KEY.BRIDGE_CONSTRUCTION_TIME },
                      select: { numValue: true },
                    }),
                );

              if (
                !bridgeConstructionBaseTime ||
                !bridgeConstructionBaseTime.numValue
              )
                throw new BadRequestException(
                  `Bridge Construction Time not set`,
                );

              const bridgeConstructionTime = Math.round(
                bridgeConstructionBaseTime.numValue -
                  (100 - nft.abilityB) / 100,
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
              const currentRailPosition = await this.cacheService.getIfCached(
                `current-rail-position:${JSON.stringify({
                  where: { color: color, gameId: gameId },
                  orderBy: { createdAt: "desc" },
                })}`,
                1,
                () =>
                  tx.railPosition.findFirst({
                    where: { color: color, gameId: gameId },
                    orderBy: { createdAt: "desc" },
                  }),
              );

              if (!currentRailPosition)
                throw new BadRequestException(
                  "Current position for rail not found",
                );

              if (currentRailPosition.x === x && currentRailPosition.y === y)
                throw new BadRequestException(
                  `Rail NFT can not be placed on the same position as current rail position`,
                );

              const railRoadConstructionBaseTime =
                await this.cacheService.getIfCached(
                  `Settings:RAIL_ROAD_CONSTRUCTION_TIME`,
                  30,
                  () =>
                    tx.settings.findUnique({
                      where: { key: SETTINGS_KEY.RAIL_ROAD_CONSTRUCTION_TIME },
                      select: { numValue: true },
                    }),
                );

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
            const nftFrozenTime = await this.cacheService.getIfCached(
              `Settings:NFT_LOCK_TIME`,
              30,
              () =>
                tx.settings.findUnique({
                  where: { key: SETTINGS_KEY.NFT_LOCK_TIME },
                  select: { numValue: true },
                }),
            );

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
        },
        { maxWait: 999999999999999, timeout: 999999999999999 },
      );

      eventParams.forEach((params) => {
        this.emit(WS_EVENTS.MAP_POSITIONS_UPDATED(...params));
      });
      this.checkAndMoveRailByGameIdAndColor(gameId, COLOR[color]);
      return res;
    },
  );

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAndMoveRail() {
    if (CONFIG.NOT_FIRST_INSTANCE) return;
    console.log("\n\ncheckAndMoveRail - cron");
    const runningGames = await this.cacheService.getIfCached(
      `running-games`,
      30,
      () =>
        this.prisma.game.findMany({
          where: { status: "RUNNING" },
        }),
    );
    runningGames.forEach((game) =>
      Object.keys(COLOR).forEach((color) =>
        this.checkAndMoveRailByGameIdAndColor(game.id, color as COLOR),
      ),
    );
  }

  async checkAndMoveRailByGameIdAndColor(gameId: string, color: COLOR) {
    const currentRailPosition = await this.cacheService.getIfCached(
      `current-rail-position:${JSON.stringify({
        where: { gameId, color },
        orderBy: { createdAt: "desc" },
      })}`,
      1,
      () =>
        this.prisma.railPosition.findFirst({
          where: { gameId, color },
          orderBy: { createdAt: "desc" },
        }),
    );

    if (!currentRailPosition) {
      console.warn(`Current Rail Position not found ${gameId} ${color}`);
      return;
    }

    const railMovementLockTime = await this.getRailMovementLockTime().catch(
      () => null,
    );

    if (!railMovementLockTime) {
      console.info(`Rail movement lock time is not set`);
      return;
    }

    if (
      Math.round(currentRailPosition.createdAt.valueOf() / 1000) >
      timestamp() - railMovementLockTime
    ) {
      console.info(`Rail is not ready to move yet  ${gameId} ${color}`);
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
      console.warn(`Invalid Rail Direction:  ${gameId} ${color}`);
      return;
    }

    const { x, y } = nextPosition.getPosition();
    if (x < 0 || y < 0 || x > 14 || y > 14) {
      console.log(
        `Colided with outer box, turning 180 degree ${gameId} ${color}`,
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

    const nextMapPosition = await this.cacheService.getIfCached(
      `next-map-position:${JSON.stringify({
        where: { x_y_gameId_color: { x, y, gameId, color } },
        include: { enemy: true, game: true, nft: true },
      })}`,
      1,
      () =>
        this.prisma.mapPosition.findUnique({
          where: { x_y_gameId_color: { x, y, gameId, color } },
          include: { enemy: true, game: true, nft: true },
        }),
    );

    if (!nextMapPosition) {
      console.warn(
        `Next Rail Position ${x},${y} not found  ${gameId} ${color}`,
      );
      return;
    }

    if (nextMapPosition.mapItem === "MOUNTAIN") {
      console.log(
        `Colided with mountain, turning 180 degree ${gameId} ${color}`,
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
        `Colided with river with no bridge constructed, turning 180 degree ${gameId} ${color}`,
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
        `Colided with undefeated enemy, turning 180 degree ${gameId} ${color}`,
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

    const nextPositionNftJob =
      nextMapPosition.nft?.job || nextMapPosition.prePlaced;

    if (!nextPositionNftJob) {
      // console.log(
      //   `No nft placed forward, rail stays on the same position ${JSON.stringify(
      //     { gameId, color },
      //     null,
      //     2,
      //   )}`,
      // );
      return;
    }

    if (
      !!nextMapPosition.nft &&
      nextMapPosition.nft.job &&
      nextMapPosition.nft.job.startsWith("RAIL") &&
      (nextMapPosition.railConstructedOn > timestamp() ||
        nextMapPosition.railConstructedOn === 0)
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
      if (nextMapPosition.railConstructedOn !== 0) {
        const delay = (nextMapPosition.railConstructedOn - timestamp()) * 1000;
        // console.log(
        //   "Adding job to check and move rail (on next rail road construction)",
        //   color,
        //   gameId,
        //   delay / 1000,
        //   "s later",
        // );
        await this.checkAndMoveRailJob.add(
          { color, gameId },
          {
            delay,
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `check-and-move-rail-${gameId}:${color}:${Math.round(
              nextMapPosition.railConstructedOn.valueOf() / 1000,
            )}`,
          },
        );
      }
      return;
    }

    if (direction === "LEFT") {
      if (
        nextPositionNftJob === "RAIL_4_6" ||
        nextPositionNftJob === "RAIL_2_4_6_8"
      ) {
        console.log(`Going left ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "LEFT",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_2_6") {
        console.log(`Going left,turning down ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_6_8") {
        console.log(`Going left, turning up ${gameId} ${color}`);
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
        nextPositionNftJob,
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
        nextPositionNftJob === "RAIL_4_6" ||
        nextPositionNftJob === "RAIL_2_4_6_8"
      ) {
        console.log(`Going right ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_2_4") {
        console.log(`Going right, turning down ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_4_8") {
        console.log(`Going right, turning up ${gameId} ${color}`);
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
        nextPositionNftJob,
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
        nextPositionNftJob === "RAIL_2_8" ||
        nextPositionNftJob === "RAIL_2_4_6_8"
      ) {
        console.log(`Going up ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "UP",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_2_6") {
        console.log(`Going up, turning right ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_2_4") {
        console.log(`Going up, turning left ${gameId} ${color}`);
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
        nextPositionNftJob,
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
        nextPositionNftJob === "RAIL_2_8" ||
        nextPositionNftJob === "RAIL_2_4_6_8"
      ) {
        console.log(`Going down ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "DOWN",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_6_8") {
        console.log(`Going down, turning right ${gameId} ${color}`);
        return await this.onPositionChange(
          color,
          gameId,
          x,
          y,
          "RIGHT",
          nextMapPosition.mapItem,
        );
      }
      if (nextPositionNftJob === "RAIL_4_8") {
        console.log(`Going down, turning left ${gameId} ${color}`);
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
        nextPositionNftJob,
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
    const { newRailPosition } = await this.prisma.$transaction(
      async (tx) => {
        const newRailPosition = await tx.railPosition.create({
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
            where: {
              x_y_gameId_color: { x, y, gameId, color: color as COLOR },
            },
            create: { x, y, color: color as COLOR, gameId, isRevealed: true },
            update: { x, y, color: color as COLOR, gameId, isRevealed: true },
          });
        }
        eventParams.push([
          { color, gameId },
          { x, y, message: "POSITIONS_REVEALED", positions: positionsToReveal },
        ]);
        return { newRailPosition };
      },
      { maxWait: 999999999999999, timeout: 999999999999999 },
    );
    eventParams.forEach((params) => {
      this.emit(WS_EVENTS.MAP_POSITIONS_UPDATED(...params));
    });
    this.emit(
      WS_EVENTS.RAIL_POSITION_CHANGED({ color, gameId }, { x, y, direction }),
    );
    if (x === 0 && y === 0) this.checkWinner(color, gameId, x, y);
    const railMovementLockTime = await this.getRailMovementLockTime().catch(
      () => null,
    );
    if (railMovementLockTime) {
      const unlockTime = Math.round(
        newRailPosition.createdAt.valueOf() / 1000 + railMovementLockTime,
      );
      const delay = (unlockTime - timestamp()) * 1000;
      // console.log(
      //   "Adding job to check and move rail",
      //   color,
      //   gameId,
      //   delay / 1000,
      //   "s later",
      // );
      await this.checkAndMoveRailJob
        .add(
          { color, gameId },
          {
            delay,
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `check-and-move-rail:${gameId}:${color}:${unlockTime}`,
          },
        )
        .catch(console.error);
    }
  }

  async checkWinner(color: COLOR, gameId: string, x: number, y: number) {
    if (x !== 0 || y !== 0) return;
    const unpassedCheckPoints = await this.cacheService.getIfCached(
      `unpassed-checkpoints-count:${JSON.stringify({
        where: {
          mapItem: "CHECKPOINT",
          checkPointPassed: false,
          gameId,
          color,
        },
      })}`,
      1,
      () =>
        this.prisma.mapPosition.count({
          where: {
            mapItem: "CHECKPOINT",
            checkPointPassed: false,
            gameId,
            color,
          },
        }),
    );

    if (unpassedCheckPoints > 0) {
      console.log(
        `Attempt winner, but ${unpassedCheckPoints} checkpoints left`,
      );
      return;
    }
    const res = await this.prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: gameId },
        data: { status: GAME_STATUS.FINISHED },
      });
      await tx.winnerTeams.create({ data: { gameId, color } });
      await tx.nft.updateMany({
        data: { level: { increment: 1 } },
        where: { gameId, color: color, level: { lt: 5 } },
      });
      await tx.$executeRaw`
        UPDATE
          nfts AS nft
        SET
          ability_b = random_between(
            asm.ability_b_min, asm.ability_b_max
          ),
          ability_l = random_between(
            asm.ability_l_min, asm.ability_l_max
          ),
          ability_k = random_between(
            asm.ability_k_min, asm.ability_k_max
          ),
          ability_r = random_between(
            asm.ability_r_min, asm.ability_r_max
          )
        FROM
          ability_score_mappings AS asm
        WHERE
          nft."level" = asm.level
          AND nft.game_id = ${gameId}
          AND nft.color::text = ${color};
      `;
      await this.gameService.resetGameToDefault(tx, gameId);
      return true;
    });

    if (res) this.emit(WS_EVENTS.GAME_FINISHED({ gameId }, { color }));
  }

  emit(data: { event: string; payload?: any }) {
    this.socketService.emit(data);
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
