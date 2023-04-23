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

  @InferMethod(endpoints.map.getMapItemVariants)
  getMapItemVariants(@Context() context: IContext) {
    return createController(
      endpoints.map.getMapItemVariants,
      context,
      this.mapService.getMapItemVariants,
    );
  }

  @InferMethod(endpoints.map.getPositions)
  getPositions(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.getPositions,
      context,
      this.mapService.getPositions,
    );
  }

  @InferMethod(endpoints.map.getNextPosibleMovementTime)
  getNextPosibleMovementTime(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.getNextPosibleMovementTime,
      context,
      this.mapService.getNextPosibleMovementTime,
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

  @Roles("ADMIN")
  @InferMethod(endpoints.map.assignEnemyToPosition)
  assignEnemyToPosition(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.assignEnemyToPosition,
      context,
      this.mapService.assignEnemyToPosition,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.map.expandEnemySize)
  expandEnemySize(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.expandEnemySize,
      context,
      this.mapService.expandEnemySize,
    );
  }

  // @Roles("GAMEDEV")
  @InferMethod(endpoints.map.placeNftOnMap)
  placeNftOnMap(@Context() context: IContext) {
    return createAsyncController(
      endpoints.map.placeNftOnMap,
      context,
      this.mapService.placeNftOnMap,
    );
  }

  // @Roles("GAMEDEV")
  // @InferMethod(endpoints.map.updateRailLocation)
  // updateRailLocation(@Context() context: IContext) {
  //   return createAsyncController(
  //     endpoints.map.updateRailLocation,
  //     context,
  //     this.mapService.updateRailLocation,
  //   );
  // }
}
