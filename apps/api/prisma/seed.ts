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

async function seedNft(gameId: string, nftCount = 2000) {
  const args: Prisma.NftCreateManyArgs = {
    data: Array(nftCount)
      .fill(0)
      .map((_, i) => ({
        name: `NFT ${i + 1} ${gameId}`,
        description: `NFT ${i + 1} description ${gameId}`,
        // owner: "0x4A7D933678676fa5F1d8dE3B6A0bBa9460fC1BdE",
        image: `https://picsum.photos/300/300?random=${i + 1}`,
        job: NFT_JOB[
          Object.keys(NFT_JOB)[
            Math.round(Math.random() * 100 * i) % Object.keys(NFT_JOB).length
          ]
        ],
        color: COLOR[Object.keys(COLOR)[i % Object.keys(COLOR).length]],
        gameId,
        abilityB: 1,
        abilityK: 1,
        abilityL: 1,
        abilityR: 1,
        frozenTill: 0,
        level: 1,
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
        numValue: 60, // 1 minutes
        title: "Bridge Construction Time",
        description: "Time in seconds to construct a bridge",
      },
      {
        key: SETTINGS_KEY.NFT_LOCK_TIME,
        valueType: "NUMBER",
        numValue: 60, // 1 minutes
        title: "NFT Locking Time",
        description: "Time in seconds to lock an NFT for after use",
      },
      {
        key: SETTINGS_KEY.RAIL_ROAD_CONSTRUCTION_TIME,
        valueType: "NUMBER",
        numValue: 60, // 1 minutes
        title: "Rail Road Construction Time",
        description: "Time in seconds to construct a rail road",
      },
      {
        key: SETTINGS_KEY.RAIL_MOVEMENT_LOCK_TIME,
        valueType: "NUMBER",
        numValue: 60, // 1 minutes
        title: "Rail Movement Lock Time",
        description:
          "Time in seconds to lock the movement of rail after each step",
      },
      {
        key: SETTINGS_KEY.LIGHT_NFT_LOCKING_TIME,
        valueType: "NUMBER",
        numValue: 60, // 1 minutes
        title: "Light NFT Locking Time",
        description: "Time in seconds to lock the Light NFT for after use",
      },
    ],
  });
}

async function seedAbilityScoresMapping() {
  await prisma.abilityScoreMapping.createMany({
    data: [
      {
        level: 1,
        abilityB_Max: 1,
        abilityB_Min: 1,
        abilityK_Max: 1,
        abilityK_Min: 1,
        abilityL_Max: 1,
        abilityL_Min: 1,
        abilityR_Max: 1,
        abilityR_Min: 1,
      },
      {
        level: 2,
        abilityB_Max: 10,
        abilityB_Min: 2,
        abilityK_Max: 4,
        abilityK_Min: 2,
        abilityL_Max: 2,
        abilityL_Min: 2,
        abilityR_Max: 10,
        abilityR_Min: 2,
      },
      {
        level: 3,
        abilityB_Max: 15,
        abilityB_Min: 11,
        abilityK_Max: 7,
        abilityK_Min: 5,
        abilityL_Max: 3,
        abilityL_Min: 3,
        abilityR_Max: 15,
        abilityR_Min: 11,
      },
      {
        level: 4,
        abilityB_Max: 20,
        abilityB_Min: 16,
        abilityK_Max: 10,
        abilityK_Min: 8,
        abilityL_Max: 4,
        abilityL_Min: 4,
        abilityR_Max: 20,
        abilityR_Min: 16,
      },
      {
        level: 5,
        abilityB_Max: 30,
        abilityB_Min: 21,
        abilityK_Max: 15,
        abilityK_Min: 11,
        abilityL_Max: 5,
        abilityL_Min: 5,
        abilityR_Max: 30,
        abilityR_Min: 21,
      },
    ],
  });
}

async function seedGame({
  name,
  nftCount,
}: {
  name: string;
  nftCount: number;
}) {
  const game = await prisma.game.create({
    data: { name, status: "WAITING" },
  });
  await prisma.railPosition.createMany({
    data: Object.values(COLOR).map((color) => ({
      color,
      direction: "LEFT",
      gameId: game.id,
      x: 14,
      y: 14,
    })),
    skipDuplicates: true,
  });
  await seedNft(game.id, nftCount);
}

async function main() {
  await seedUser();
  await seedSettings();
  await seedAbilityScoresMapping();
  // await seedGame({ name: "game1", nftCount: 2000 });
  // await seedGame({ name: "game2", nftCount: 1000 });
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
