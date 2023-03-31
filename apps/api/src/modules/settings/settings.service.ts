import { Injectable } from "@nestjs/common";
import { endpoints, WS_EVENTS } from "api-interface";
import { createAsyncService } from "src/utils/common.utils";
import { PrismaService } from "../prisma/prisma.service";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  emit({ event, payload }: { event: string; payload?: any }) {
    console.log("Socket : ", event);
    this.socketService.socket?.emit(event, payload);
  }

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
      this.emit(
        WS_EVENTS.GAME_PREFERENCE_UPDATED({
          key,
          boolValue,
          numValue,
          strValue,
        }),
      );
      return "updated";
    },
  );

  getAllAbilityScoreMappings = createAsyncService<
    typeof endpoints.settings.getAllAbilityScoreMappings
  >(async () => {
    return await this.prisma.abilityScoreMapping.findMany();
  });
}
