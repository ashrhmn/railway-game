import { BadRequestException, Injectable } from "@nestjs/common";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import { COLOR, GAME_STATUS } from "@prisma/client";
import { Position } from "src/classes/Position";

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  getAll = createAsyncService<typeof endpoints.game.getAll>(
    async ({ query: { skip, take } }) => {
      const games = await this.prisma.game.findMany({ skip, take });
      return games;
    },
  );

  createGame = createAsyncService<typeof endpoints.game.createGame>(
    async ({ body: { name, contractAddress, chainId } }) => {
      return this.prisma.$transaction(async (tx) => {
        const game = await tx.game.create({
          data: { name, contractAddress, status: "WAITING", chainId },
        });
        await tx.railPosition.createMany({
          data: Object.keys(COLOR).map((color) => ({
            color: color as COLOR,
            gameId: game.id,
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
        return "success";
      });
    },
  );

  updateGame = createAsyncService<typeof endpoints.game.updateGame>(
    async ({ body, param: { id } }) => {
      if (!!body.status && !Object.keys(GAME_STATUS).includes(body.status))
        throw new BadRequestException("Invalid Game Status");
      await this.prisma.game.update({
        where: { id },
        data: { ...body, status: body.status as GAME_STATUS },
      });
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

    return position;
  });
}
