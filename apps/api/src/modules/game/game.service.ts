import { BadRequestException, Injectable } from "@nestjs/common";
import { endpoints, WS_EVENTS } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import { COLOR, GAME_STATUS } from "@prisma/client";
import { Position } from "src/classes/Position";
import { SocketService } from "../socket/socket.service";
import { CONFIG } from "src/config/app.config";
import { EventsService } from "../events/events.service";

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
    private readonly eventsService: EventsService,
  ) {}

  getAll = createAsyncService<typeof endpoints.game.getAll>(
    async ({ query: { skip, take } }) => {
      return await this.prisma.game.findMany({
        skip,
        take,
        include: {
          _count: {
            select: {
              nfts: true,
              mapPositions: true,
              railPositions: true,
              winnerTeams: true,
            },
          },
        },
      });
    },
  );

  createGame = createAsyncService<typeof endpoints.game.createGame>(
    async ({ body: { name, contractAddress, chainId } }) => {
      if (chainId !== undefined && !CONFIG.SUPPORTED_CHAINS.includes(chainId))
        throw new BadRequestException("Invalid Chain Id");
      const game = await this.prisma.$transaction(async (tx) => {
        const game = await tx.game.create({
          data: { name, contractAddress, status: "WAITING", chainId },
        });
        await tx.railPosition.createMany({
          data: Object.keys(COLOR).map((color) => ({
            color: color as COLOR,
            gameId: game.id,
            direction: "LEFT",
          })),
          skipDuplicates: true,
        });
        const root = new Position(14, 14);
        const data = [
          root,
          root.left(),
          root.left().left(),
          root.down(),
          root.down().down(),
          root.down().left(),
          root.down().left().left(),
          root.down().left().down(),
        ]
          .map((pos) => pos.getPosition())
          .map(({ x, y }) =>
            Object.keys(COLOR).map((color) => ({
              gameId: game.id,
              x,
              y,
              isRevealed: true,
              color: color as COLOR,
            })),
          )
          .reduce((acc, val) => acc.concat(val), []);
        await tx.mapPosition.createMany({ data });
        return game;
      });
      if (game.contractAddress && game.chainId)
        this.eventsService.addEventListenerForGame(
          game.contractAddress,
          game.chainId,
          game.id,
        );
      return "success";
    },
  );

  updateGame = createAsyncService<typeof endpoints.game.updateGame>(
    async ({ body, param: { id } }) => {
      if (
        body.chainId !== undefined &&
        !CONFIG.SUPPORTED_CHAINS.includes(body.chainId)
      )
        throw new BadRequestException("Invalid Chain Id");
      if (!!body.status && !Object.keys(GAME_STATUS).includes(body.status))
        throw new BadRequestException("Invalid Game Status");
      await this.prisma.game.update({
        where: { id },
        data: { ...body, status: body.status as GAME_STATUS },
      });
      if (body.status === GAME_STATUS.RUNNING)
        this.emit(WS_EVENTS.GAME_STARTED({ gameId: id }));

      if (body.contractAddress && body.chainId)
        this.eventsService.addEventListenerForGame(
          body.contractAddress,
          body.chainId,
          id,
        );

      return "success";
    },
  );

  getAllStatus = createAsyncService<typeof endpoints.game.getAllStatus>(
    async () => {
      return Object.keys(GAME_STATUS).map((name) => ({
        name,
        id: name,
      }));
    },
  );

  getCurrentRailPosition = createAsyncService<
    typeof endpoints.game.getCurrentRailPosition
  >(async ({ query: { color, gameId } }) => {
    const position = await this.prisma.railPosition.findFirst({
      where: { color: color as COLOR, gameId },
      orderBy: { createdAt: "desc" },
    });

    if (!position) throw new BadRequestException("Rail not placed yet");

    return {
      ...position,
      createdAt: Math.round(position.createdAt.valueOf() / 1000),
    };
  });

  getColorsAvailableForWalletByGameId = createAsyncService<
    typeof endpoints.game.getColorsAvailableForWalletByGameId
  >(async ({ param: { gameId, walletAddress } }) => {
    return this.prisma.nft
      .groupBy({
        by: ["color"],
        where: {
          gameId,
          owner: { equals: walletAddress, mode: "insensitive" },
        },
      })
      .then((res) => res.map((r) => r.color));
  });

  deleteGame = createAsyncService<typeof endpoints.game.deleteGame>(
    async ({ param: { id } }) => {
      return this.prisma.$transaction(async (tx) => {
        await tx.mapPosition.deleteMany({ where: { gameId: id } });
        await tx.railPosition.deleteMany({ where: { gameId: id } });
        await tx.nft.deleteMany({ where: { gameId: id } });
        await tx.winnerTeams.deleteMany({ where: { gameId: id } });
        await tx.game.delete({ where: { id } });
        return "deleted";
      });
    },
  );

  emit({ event, payload }: { event: string; payload?: any }) {
    console.log("Socket : ", event);
    this.socketService.socket?.emit(event, payload);
  }
}
