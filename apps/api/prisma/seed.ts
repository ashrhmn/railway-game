import { PrismaClient } from "@prisma/client";
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

async function main() {
  seedUser();
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
