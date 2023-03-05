import { Injectable } from "@nestjs/common";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";

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
    async ({ body: { name, contractAddress } }) => {
      await this.prisma.game.create({
        data: { name, contractAddress, status: "WAITING" },
      });
      return "success";
    },
  );

  updateGame = createAsyncService<typeof endpoints.game.updateGame>(
    async ({ body: { name, contractAddress }, param: { id } }) => {
      await this.prisma.game.update({
        where: { id },
        data: { name, contractAddress },
      });
      return "success";
    },
  );
}
