import { Injectable } from "@nestjs/common";
import { endpoints } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll = createAsyncService<typeof endpoints.settings.getAll>(async () => {
    const settings = await this.prisma.settings.findMany({
      orderBy: { id: "asc" },
    });
    return settings;
  });

  update = createAsyncService<typeof endpoints.settings.update>(
    async ({ param: { key }, body: { boolValue, numValue, strValue } }) => {
      await this.prisma.settings.update({
        where: { key },
        data: { boolValue, numValue, strValue },
      });
      return "updated";
    },
  );
}
