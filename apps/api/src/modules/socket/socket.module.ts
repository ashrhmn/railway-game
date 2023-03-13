import { Module, Global } from "@nestjs/common";
import { AppGateway } from "./app.gateway";
import { SocketService } from "./socket.service";

@Global()
@Module({
  controllers: [],
  providers: [SocketService, AppGateway],
  exports: [SocketService, AppGateway],
})
export class SocketModule {}
