import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import { createController } from "src/utils/common.utils";
import { MapService } from "./map.service";

@Controller()
export class MapController {
  constructor(private readonly mapService: MapService) { }
  @InferMethod(endpoints.map.getColors)
  getColors(@Context() context: IContext) {
    return createController(
      endpoints.map.getColors,
      context,
      this.mapService.getColors,
    );
  }
}
