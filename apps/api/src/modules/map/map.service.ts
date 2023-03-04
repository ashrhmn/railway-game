import { Injectable } from "@nestjs/common";
import { COLOR } from "@prisma/client";
import { endpoints } from "api-interface";
import { createService } from "src/utils/common.utils";

@Injectable()
export class MapService {
  getColors = createService<typeof endpoints.map.getColors>(() => {
    return Object.keys(COLOR);
  });
}
