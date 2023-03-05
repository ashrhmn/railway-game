import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";
import { GameService } from "./game.service";

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

  @InferMethod(endpoints.game.createGame)
  createGame(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.createGame,
      context,
      this.gameService.createGame,
    );
  }

  @InferMethod(endpoints.game.updateGame)
  updateGame(@Context() context: IContext) {
    return createAsyncController(
      endpoints.game.updateGame,
      context,
      this.gameService.updateGame,
    );
  }
}
