import { Nft, NFT_JOB, Prisma, PrismaClient } from "@prisma/client";
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

async function seedNft() {
  const args: Prisma.NftCreateManyArgs = {
    data: Array(100)
      .fill(0)
      .map((_, i) => ({
        name: `NFT ${i + 1}`,
        description: `NFT ${i + 1} description`,
        image: `https://picsum.photos/200/300?random=${i + 1}`,
        job: NFT_JOB[
          Object.keys(NFT_JOB)[
            Math.round(Math.random() * 100 * i) % Object.keys(NFT_JOB).length
          ]
        ],
        color: "RED",
      })),
  };

  await prisma.nft.createMany(args);
}

async function main() {
  seedUser();
  seedNft();
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
