import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import axios from "axios";

@Injectable()
export class SocketService {
  public socket: Server | null = null;

  async emit({ payload, event }: { event: string; payload?: any }) {
    console.log("Socket : ", event);
    if (this.socket) this.socket.emit(event, payload);
    else console.warn("Socket not initialized");
    const SOCKET_SERVER_PORT = process.env.NEXT_PUBLIC_SOCKET_PORT || 4001;
    if (SOCKET_SERVER_PORT) {
      const res = await axios.post(
        `http://localhost:${SOCKET_SERVER_PORT}/__socket_emit`,
        { event, args: payload },
      );
      if (res.status !== 201) console.warn("Socket emit failed");
    } else console.warn("Socket server port not set");
  }
}
