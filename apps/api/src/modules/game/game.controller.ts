import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";
import { GameService } from "./game.service";
import { Roles } from "src/guards/roles.guard";

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @InferMethod(endpoints.game.getAll)
  getAll(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.getAll,
      context,
      this.gameService.getAll,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.game.createGame)
  createGame(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.createGame,
      context,
      this.gameService.createGame,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.game.updateGame)
  updateGame(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.updateGame,
      context,
      this.gameService.updateGame,
    );
  }

  @InferMethod(endpoints.game.getAllStatus)
  getAllStatus(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.getAllStatus,
      context,
      this.gameService.getAllStatus,
    );
  }

  @InferMethod(endpoints.game.getCurrentRailPosition)
  getCurrentRailPosition(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.getCurrentRailPosition,
      context,
      this.gameService.getCurrentRailPosition,
    );
  }

  @InferMethod(endpoints.game.getColorsAvailableForWalletByGameId)
  getColorsAvailableForWalletByGameId(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.getColorsAvailableForWalletByGameId,
      context,
      this.gameService.getColorsAvailableForWalletByGameId,
    );
  }

  @InferMethod(endpoints.game.deleteGame)
  deleteGame(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.deleteGame,
      context,
      this.gameService.deleteGame,
    );
  }
}
