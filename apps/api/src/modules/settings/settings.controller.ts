import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { InferMethod, Context } from "src/decorators";
import { Roles } from "src/guards/roles.guard";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";
import { SettingsService } from "./settings.service";

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles("ADMIN")
  @InferMethod(endpoints.settings.getAll)
  getAll(@Context() context: IContext) {
    return createAsyncController(
      endpoints.settings.getAll,
      context,
      this.settingsService.getAll,
    );
  }

  @Roles("ADMIN")
  @InferMethod(endpoints.settings.update)
  update(@Context() context: IContext) {
    return createAsyncController(
      endpoints.settings.update,
      context,
      this.settingsService.update,
    );
  }
}
