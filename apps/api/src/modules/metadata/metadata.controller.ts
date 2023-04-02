import { Controller } from "@nestjs/common";
import { endpoints } from "api-interface";
import { Context, InferMethod } from "src/decorators";
import { IContext } from "src/interfaces";
import { createAsyncController } from "src/utils/common.utils";
import { MetadataService } from "./metadata.service";

@Controller()
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @InferMethod(endpoints.metadata.contractUri)
  contractUri(@Context() context: IContext) {
    return createAsyncController(
      endpoints.metadata.contractUri,
      context,
      this.metadataService.contractUri,
    );
  }

  @InferMethod(endpoints.metadata.tokenUri)
  tokenUri(@Context() context: IContext) {
    return createAsyncController(
      endpoints.metadata.tokenUri,
      context,
      this.metadataService.tokenUri,
    );
  }
}
