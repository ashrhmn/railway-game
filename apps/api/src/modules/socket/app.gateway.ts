import {
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server } from "socket.io";
import { SocketService } from "./socket.service";

@WebSocketGateway({ cors: { origin: "*" } })
// , OnGatewayConnection, OnGatewayDisconnect
export class AppGateway implements OnGatewayInit {
  constructor(private socketService: SocketService) {}
  @WebSocketServer() public server: Server;
  private logger: Logger = new Logger("AppGateway");

  afterInit(server: Server) {
    this.logger.log("Socket Initialized!");
    this.socketService.socket = server;
  }

  // handleDisconnect(client: Socket) {
  //   this.logger.log(`Client disconnected: ${client.id}`);
  // }

  // handleConnection(client: Socket, ..._args: any[]) {
  //   this.logger.log(`Client connected: ${client.id}`);
  // }
}
