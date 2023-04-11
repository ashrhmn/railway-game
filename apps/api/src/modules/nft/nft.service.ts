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
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { QueueJobEnum } from "src/enums/queue-job.enum";
import { IUpdateNftOwnerJobData } from "src/providers/jobs/update-nft-owner.processor";

@Injectable()
export class NftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
    @InjectQueue(QueueJobEnum.UPDATE_NFT_OWNER)
    private readonly updateNftOwnerJob: Queue<IUpdateNftOwnerJobData>,
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
      const unfilteredCount = await this.prisma.nft.count({
        where: {
          gameId,
        },
      });
      return { data: nfts, count, unfilteredCount };
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
        data: data.map(
          ({
            description,
            image,
            name,
            color,
            job,
            level,
            b,
            l,
            k,
            r,
            ...meta
          }) => ({
            gameId: game_id,
            color: COLOR[color],
            level: level,
            abilityR: r,
            abilityB: b,
            abilityK: k,
            abilityL: l,
            name,
            description,
            image,
            job: NFT_JOB[job],
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
          }),
        ),
      });

      return "added";
    });
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      this.randomizeFixTokenId(
        { body: { gameId: game_id }, param: {}, query: {} },
        {} as any,
      );
    })();

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
      // console.log(`Owner not found for ${address} ${chainId} ${tokenId}`);
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
      // await this.updateNftOwner({
      //   address: game.contractAddress,
      //   tokenId,
      //   chainId: game.chainId,
      // });
      await this.updateNftOwnerJob.add(
        {
          address: game.contractAddress,
          chainId: game.chainId,
          tokenId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `UPDATE_OWNER:${game.chainId}:${game.contractAddress}:${tokenId}`,
        },
      );
    }
  }

  async _updateNftsByPercentage(
    gameId: string,
    tx: Omit<
      PrismaService,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use"
    >,
  ) {
    const jobRatios = await tx.nftJobsRatio.findMany({
      where: { gameId, percentage: { gt: 0 } },
      select: { job: true, percentage: true },
    });
    await tx.nft.updateMany({ data: { flag: false }, where: {} });
    await tx.nft.updateMany({ data: { flag: true }, where: { gameId } });
    const total = await tx.nft.count({ where: { gameId } });
    for (const { percentage, job } of jobRatios) {
      if (!!((percentage * total) % (100 * Object.values(COLOR).length)))
        throw new BadRequestException(
          `Total number of nfts per color must be a rounded number, Error on ${job}`,
        );
      const limit = (percentage / 100) * total;
      const unknownIds =
        await tx.$queryRaw`SELECT id FROM public.nfts WHERE game_id = ${gameId} AND flag = true ORDER BY RANDOM() LIMIT ${limit}`;
      const ids = z
        .object({ id: z.string().cuid() })
        .array()
        .parse(unknownIds)
        .map(({ id }) => id);

      if (ids.length === 0) continue;

      for (const [index, color] of Object.values(COLOR).entries()) {
        await tx.nft.updateMany({
          where: {
            id: {
              in: ids.filter(
                (_, i) =>
                  i >= (ids.length / Object.values(COLOR).length) * index &&
                  i < (ids.length / Object.values(COLOR).length) * (index + 1),
              ),
            },
          },
          data: { job, color, flag: false },
        });
      }
    }
    return "Updated";
  }

  updateNftsByPercentage = createAsyncService<
    typeof endpoints.nft.updateNftsByPercentage
  >(async ({ body: { jobs, gameId } }) => {
    if (jobs.reduce((prev, curr) => prev + curr.percentage, 0) !== 100)
      throw new BadRequestException("Percentages total must be 100");
    const res = await this.prisma.$transaction(
      async (tx) => {
        await tx.nftJobsRatio.deleteMany({ where: { gameId } });
        await tx.nftJobsRatio.createMany({
          data: jobs
            .filter((j) => j.percentage > 0)
            .map(({ job, percentage }) => ({ gameId, job, percentage })),
        });
        return await this._updateNftsByPercentage(gameId, tx);
      },
      { maxWait: 999999999999999, timeout: 999999999999999 },
    );
    return res;
  });

  emit(data: { event: string; payload?: any }) {
    this.socketService.emit(data);
  }
}
