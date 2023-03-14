import { BadRequestException, HttpException, Injectable } from "@nestjs/common";
import { COLOR, NFT_JOB } from "@prisma/client";
import { endpoints, WS_EVENTS } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import * as csvParser from "csv-parser";
import { once } from "events";
import { Readable } from "stream";
import { z } from "zod";
import { ethers } from "ethers";
import { CONFIG } from "src/config/app.config";
import { Cron } from "@nestjs/schedule";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class NftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  getNft = createAsyncService<typeof endpoints.nft.getNft>(
    async ({ param: { id } }) => {
      const nft = await this.prisma.nft.findUnique({
        where: { id },
      });
      if (!nft) throw new HttpException("NFT not found", 404);
      return nft;
    },
  );

  getAllNfts = createAsyncService<typeof endpoints.nft.getAllNfts>(
    async ({
      query: {
        skip,
        take,
        gameId,
        color,
        level,
        owner,
        abilityB,
        abilityK,
        abilityL,
        abilityR,
      },
    }) => {
      const nfts = await this.prisma.nft.findMany({
        take,
        skip,
        where: {
          gameId,
          level,
          ...(!!color && COLOR[color] ? { color: COLOR[color] } : {}),
          ...(!!owner ? { owner: { equals: owner, mode: "insensitive" } } : {}),
          abilityR,
          abilityL,
          abilityK,
          abilityB,
        },
        orderBy: { tokenId: "asc" },
      });
      const count = await this.prisma.nft.count({
        where: {
          gameId,
          level,
          owner,
          ...(!!color && COLOR[color] ? { color: COLOR[color] } : {}),
          abilityR,
          abilityL,
          abilityK,
          abilityB,
        },
      });
      return { data: nfts, count };
    },
  );

  deleteAllNfts = createAsyncService<typeof endpoints.nft.deleteAllNfts>(
    async ({ param: { game_id } }) => {
      await this.prisma.nft.deleteMany({ where: { gameId: game_id } });
      return "deleted";
    },
  );

  async addCsvNfts(
    file: { buffer: Iterable<any> | AsyncIterable<any>; mimetype: string },
    body: { replace: string; game_id: string },
  ) {
    if (!file) throw new BadRequestException("No file provided");
    if (file.mimetype !== "text/csv")
      throw new BadRequestException("File must be a CSV");
    const { game_id, replace } = z
      .object({
        replace: z.string().optional(),
        game_id: z.string().min(1),
      })
      .parse(body);
    const results: any[] = [];
    try {
      const stream = Readable.from(file.buffer);
      stream.pipe(csvParser()).on("data", (data) => results.push(data));
      await once(stream, "end");
    } catch (error) {
      throw new BadRequestException("Error parsing CSV");
    }
    if (results.length === 0)
      throw new BadRequestException("No data found in CSV");
    const data = z
      .object({
        name: z.string(),
        description: z.string(),
        image: z.string(),
        color: z.enum([COLOR.BLACK, ...Object.keys(COLOR)]),
        job: z.enum([NFT_JOB.BRIDGE, ...Object.keys(NFT_JOB)]),
        level: z.coerce.number().default(1),
        r: z.coerce.number().default(1),
        b: z.coerce.number().default(1),
        k: z.coerce.number().default(1),
        l: z.coerce.number().default(1),
      })
      .passthrough()
      .array()
      .parse(results);

    const res = await this.prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.nft.deleteMany({ where: { gameId: game_id } });
      }
      await tx.nft.createMany({
        data: data.map(({ description, image, name, ...meta }) => ({
          gameId: game_id,
          color: COLOR[meta.color],
          level: meta.level,
          abilityR: meta.r,
          abilityB: meta.b,
          abilityK: meta.k,
          abilityL: meta.l,
          name,
          description,
          image,
          job: NFT_JOB[meta.job],
          metadata: Object.keys(meta).reduce(
            (prev, curr) => [
              ...prev,
              {
                type: curr,
                value: meta[curr] as any,
              },
            ],
            [],
          ),
        })),
      });

      return "added";
    });

    return res;
  }

  randomizeFixTokenId = createAsyncService<
    typeof endpoints.nft.randomizeFixTokenId
  >(async ({ body: { gameId } }) => {
    const res = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
      UPDATE
        public.nfts
      SET
        "token_id" = "token_id" +(
          SELECT
            MAX(token_id)
          FROM
            public.nfts
          WHERE
            game_id = ${gameId}
        )
      WHERE
        game_id = ${gameId};
    `;

      await tx.$queryRaw`
      UPDATE
        public.nfts
      SET
        "token_id" = sub.token_id,owner=null
      FROM
        (
          SELECT
            *,
            (
              ROW_NUMBER() OVER()
            )::INT AS token_id
          FROM
            (
              SELECT
                id
              FROM
                public.nfts
              WHERE
                game_id = ${gameId}
              ORDER BY
                RANDOM()
            ) AS foo
        ) AS sub
      WHERE
        nfts.id = sub.id;
    `;

      return "fixed";
    });
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      this.updateNftOwnersByGameId(gameId);
    })();
    return res;
  });

  async updateNftOwner({
    address,
    chainId,
    tokenId,
  }: {
    address: string;
    tokenId: number;
    chainId: number;
  }) {
    const nft = await this.prisma.nft.findFirst({
      where: { tokenId, game: { contractAddress: address, chainId } },
    });

    if (!nft) {
      console.log(`NFT not found for ${address} ${chainId} ${tokenId}`);
      return;
    }

    const contract = new ethers.Contract(
      address,
      CONFIG.ABI.SAMPLE721,
      CONFIG.PROVIDER(chainId),
    );

    const owner = await contract.ownerOf(tokenId).catch(() => null);

    if (!owner) {
      console.log(`Owner not found for ${address} ${chainId} ${tokenId}`);
      return;
    }

    if (nft.owner?.toLowerCase() === owner.toLowerCase()) return;

    this.emit(
      WS_EVENTS.NFT_OWNER_CHANGED({ gameId: nft.gameId, tokenId: nft.tokenId }),
    );

    await this.prisma.nft
      .update({
        where: { id: nft.id },
        data: { owner },
      })
      .then(() => console.log(`Updated ${address} ${chainId} ${tokenId}`))
      .catch((error) =>
        console.error(
          `Error updating ${address} ${chainId} ${tokenId} ${{ error }}`,
        ),
      );
  }

  @Cron("0 2 * * *") // 2 AM everyday
  async updateAllNftOwners() {
    const games = await this.prisma.game.findMany({
      where: {
        contractAddress: { not: null },
        chainId: { in: CONFIG.SUPPORTED_CHAINS },
      },
      select: {
        id: true,
      },
    });

    for (const { id } of games) {
      await this.updateNftOwnersByGameId(id);
    }
  }

  async updateNftOwnersByGameId(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        contractAddress: true,
        chainId: true,
        nfts: { select: { tokenId: true } },
      },
    });
    if (!game || !game.contractAddress || !game.chainId) return;
    for (const { tokenId } of game.nfts) {
      await this.updateNftOwner({
        address: game.contractAddress,
        tokenId,
        chainId: game.chainId,
      });
    }
  }

  emit({ event, payload }: { event: string; payload?: any }) {
    this.socketService.socket?.emit(event, payload);
  }
}
