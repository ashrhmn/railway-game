import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Connected :", socket.id);
  socket.on("disconnect", () => {
    console.log("Disconnected :", socket.id);
  });
});

app.post("/__socket_emit", (req, res) => {
  try {
    const event = req.body?.event || "UNKNOWN";
    const args = req.body?.args || {};
    io.emit(event, args);
    res.status(201).send("ok");
  } catch (error) {
    res.status(400).send(error);
  }
});

const PORT = process.env.NEXT_PUBLIC_SOCKET_PORT || 4001;

server.listen(PORT, () => console.log(`Socket server started on port ${PORT}`));
