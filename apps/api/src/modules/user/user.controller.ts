import { Controller } from "@nestjs/common";
import { UserService } from "./user.service";
import { endpoints } from "api-interface";
import { InferMethod, Context } from "src/decorators";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @InferMethod(endpoints.user.getAllUsers)
  getAllUsers(@Context() context: IContext) {
    return createAsyncController(
      endpoints.user.getAllUsers,
      context,
      this.userService.getAllUsers,
    );
  }

  @InferMethod(endpoints.user.createUser)
  createUser(@Context() context: IContext) {
    return createAsyncController(
      endpoints.user.createUser,
      context,
      this.userService.createUser,
    );
  }

  @InferMethod(endpoints.user.updateUser)
  updateUser(@Context() context: IContext) {
    return createAsyncController(
      endpoints.user.updateUser,
      context,
      this.userService.updateUser,
    );
  }

  @InferMethod(endpoints.user.deleteUser)
  deleteUser(@Context() context: IContext) {
    return createAsyncController(
      endpoints.user.deleteUser,
      context,
      this.userService.deleteUser,
    );
  }
}
