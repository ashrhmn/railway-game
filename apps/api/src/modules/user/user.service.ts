import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createAsyncService } from "src/utils/common.utils";
import { endpoints } from "api-interface";
import { ROLE } from "@prisma/client";
import { hash } from "argon2";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  getAllUsers = createAsyncService<typeof endpoints.user.getAllUsers>(
    async () => {
      return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    },
  );

  createUser = createAsyncService<typeof endpoints.user.createUser>(
    async ({ body: { name, password, roles, username } }) => {
      await this.prisma.user.create({
        data: {
          username,
          password: await hash(password),
          roles: roles,
          name,
        },
      });
      return "created";
    },
  );

  updateUser = createAsyncService<typeof endpoints.user.updateUser>(
    async ({
      body: { name, password: plainPassword, roles, username, confirmPassword },
      param: { id },
    }) => {
      console.log(roles);
      if (!!plainPassword && plainPassword !== confirmPassword)
        throw new BadRequestException("Password does not match");
      const password = !!plainPassword ? await hash(plainPassword) : undefined;
      await this.prisma.user.update({
        where: { id },
        data: {
          name,
          password,
          username,
          roles,
        },
      });
      return "updated";
    },
  );

  deleteUser = createAsyncService<typeof endpoints.user.deleteUser>(
    async ({ param: { id } }) => {
      await this.prisma.user.delete({ where: { id } });
      return "deleted";
    },
  );

  getRoles = createAsyncService<typeof endpoints.user.getRoles>(async () => {
    return Object.values(ROLE);
  });
}
