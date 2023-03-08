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
      return this.prisma.user.findMany();
    },
  );

  createUser = createAsyncService<typeof endpoints.user.createUser>(
    async ({ body: { name, password, roles, username } }) => {
      if (!roles.every((r) => Object.keys(ROLE).includes(r)))
        throw new BadRequestException("Invalid Role");
      await this.prisma.user.create({
        data: {
          username,
          password: await hash(password),
          roles: roles as ROLE[],
          name,
        },
      });
      return "created";
    },
  );

  updateUser = createAsyncService<typeof endpoints.user.updateUser>(
    async ({
      body: { name, password: plainPassword, roles, username },
      param: { id },
    }) => {
      if (!!roles && !roles.every((r) => Object.keys(ROLE).includes(r)))
        throw new BadRequestException("Invalid Role");
      const password = !!plainPassword ? await hash(plainPassword) : undefined;
      await this.prisma.user.update({
        where: { id },
        data: { name, password, username, roles: roles as ROLE[] | undefined },
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
    return Object.keys(ROLE);
  });
}
