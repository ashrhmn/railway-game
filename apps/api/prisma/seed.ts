/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { COLOR, NFT_JOB, Prisma, PrismaClient } from "@prisma/client";
import { hash } from "argon2";

export enum SETTINGS_KEY {
  BRIDGE_CONSTRUCTION_TIME = "BRIDGE_CONSTRUCTION_TIME",
  RAIL_ROAD_CONSTRUCTION_TIME = "RAIL_ROAD_CONSTRUCTION_TIME",
  NFT_LOCK_TIME = "NFT_LOCK_TIME",
  RAIL_MOVEMENT_LOCK_TIME = "RAIL_MOVEMENT_LOCK_TIME",
  LIGHT_NFT_LOCKING_TIME = "LIGHT_NFT_LOCKING_TIME",
}

const prisma = new PrismaClient();

async function seedUser() {
  await prisma.user.createMany({
    data: [
      {
        username: "ash",
        password: await hash("ash"),
        roles: ["USER", "ADMIN"],
      },
      {
        username: "dev",
        password: await hash("dev"),
        roles: ["GAMEDEV"],
      },
      {
        username: "admin",
        password: await hash("admin"),
        roles: ["ADMIN"],
      },
    ],
    skipDuplicates: true,
  });
}

async function seedNft(gameId: string) {
  const args: Prisma.NftCreateManyArgs = {
    data: Array(10)
      .fill(0)
      .map((_, i) => ({
        name: `NFT ${i + 1} ${gameId}`,
        description: `NFT ${i + 1} description ${gameId}`,
        owner: "0x4A7D933678676fa5F1d8dE3B6A0bBa9460fC1BdE",
        image: `https://picsum.photos/300/300?random=${i + 1}`,
        job: NFT_JOB[
          Object.keys(NFT_JOB)[
            Math.round(Math.random() * 100 * i) % Object.keys(NFT_JOB).length
          ]
        ],
        color:
          COLOR[
            Object.keys(COLOR)[
              Math.round(Math.random() * 100 * i) % Object.keys(COLOR).length
            ]
          ],
        gameId,
        abilityB: Math.round(Math.random() * 4),
        abilityK: Math.round(Math.random() * 4),
        abilityL: Math.round(Math.random() * 4),
        abilityR: Math.round(Math.random() * 4),
        frozenTill: 0,
        level: Math.round(Math.random() * 4),
        metadata: [
          {
            type: "type1",
            value: "value1",
          },
          {
            type: "type2",
            value: "value2",
          },
        ],
      })),
  };

  await prisma.nft.createMany(args);
}

async function seedSettings() {
  await prisma.settings.createMany({
    data: [
      {
        key: SETTINGS_KEY.BRIDGE_CONSTRUCTION_TIME,
        valueType: "NUMBER",
        numValue: 600, // 10 minutes
        title: "Bridge Construction Time",
        description: "Time in seconds to construct a bridge",
      },
      {
        key: SETTINGS_KEY.NFT_LOCK_TIME,
        valueType: "NUMBER",
        numValue: 600, // 10 minutes
        title: "NFT Locking Time",
        description: "Time in seconds to lock an NFT for after use",
      },
      {
        key: SETTINGS_KEY.RAIL_ROAD_CONSTRUCTION_TIME,
        valueType: "NUMBER",
        numValue: 600, // 10 minutes
        title: "Rail Road Construction Time",
        description: "Time in seconds to construct a rail road",
      },
      {
        key: SETTINGS_KEY.RAIL_MOVEMENT_LOCK_TIME,
        valueType: "NUMBER",
        numValue: 600, // 10 minutes
        title: "Rail Movement Lock Time",
        description:
          "Time in seconds to lock the movement of rail after each step",
      },
      {
        key: SETTINGS_KEY.LIGHT_NFT_LOCKING_TIME,
        valueType: "NUMBER",
        numValue: 600, // 10 minutes
        title: "Light NFT Locking Time",
        description: "Time in seconds to lock the Light NFT for after use",
      },
    ],
  });
}

async function main() {
  seedUser();
  seedSettings();
  // const game1 = await prisma.game.create({
  //   data: { name: "game1", status: "WAITING" },
  // });
  // const game2 = await prisma.game.create({
  //   data: { name: "game2", status: "WAITING" },
  // });
  // seedNft(game1.id);
  // seedNft(game2.id);
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
