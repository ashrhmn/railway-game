import { COLOR, NFT_JOB, Prisma, PrismaClient } from "@prisma/client";
import { hash } from "argon2";
const prisma = new PrismaClient();

async function seedUser() {
  await prisma.user.createMany({
    data: [
      {
        username: "ashik",
        password: await hash("ash"),
        roles: ["USER", "ADMIN"],
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
        isFrozen: Math.round(Math.random() * 40) % 2 === 0,
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

async function main() {
  seedUser();
  const game1 = await prisma.game.create({
    data: { name: "game1", status: "WAITING" },
  });
  // const game2 = await prisma.game.create({
  //   data: { name: "game2", status: "WAITING" },
  // });
  seedNft(game1.id);
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
