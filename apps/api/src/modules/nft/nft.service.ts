import { BadRequestException, HttpException, Injectable } from "@nestjs/common";
import { COLOR, NFT_JOB } from "@prisma/client";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import * as csvParser from "csv-parser";
import { once } from "events";
import { Readable } from "stream";
import { z } from "zod";

@Injectable()
export class NftService {
  constructor(private readonly prisma: PrismaService) {}

  getNft = createAsyncService<typeof endpoints.nft.getNft>(
    async ({ param: { id } }) => {
      const nft = await this.prisma.nft.findFirst({
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
        isFrozen,
      },
    }) => {
      const nfts = await this.prisma.nft.findMany({
        take,
        skip,
        where: {
          gameId,
          level,
          owner,
          ...(!!color && COLOR[color] ? { color: COLOR[color] } : {}),
          abilityR,
          abilityL,
          abilityK,
          abilityB,
          isFrozen,
        },
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
          isFrozen,
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

    return this.prisma.$transaction(async (tx) => {
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
  }
}
