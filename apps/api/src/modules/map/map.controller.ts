import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import {
  createAsyncController,
  createController,
} from "src/utils/common.utils";
import { MapService } from "./map.service";
import { Roles } from "src/guards/roles.guard";

@Controller()
export class MapController {
  constructor(private readonly mapService: MapService) {}
  @InferMethod(endpoints.map.getColors)
  getColors(@Context() context: IContext) {
    return createController(
      endpoints.map.getColors,
      context,
      this.mapService.getColors,
    );
  }

  @InferMethod(endpoints.map.getNftJobs)
  getNftJobs(@Context() context: IContext) {
    return createController(
      endpoints.map.getNftJobs,
      context,
      this.mapService.getNftJobs,
    );
  }

  @InferMethod(endpoints.map.getMapItems)
  getMapItems(@Context() context: IContext) {
    return createController(
      endpoints.map.getMapItems,
      context,
      this.mapService.getMapItems,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.map.getPositions)
  getPositions(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.getPositions,
      context,
      this.mapService.getPositions,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.map.assignItemToPosition)
  assignItemToPosition(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.assignItemToPosition,
      context,
      this.mapService.assignItemToPosition,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.map.removeItem)
  removeItem(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.removeItem,
      context,
      this.mapService.removeItem,
    );
  }
}
