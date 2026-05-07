import { Server } from "http";
import { WebSocketServer } from "ws";
import type { ClientMessage } from "./types";
import { getUserFromRequest } from "./auth";
import RouteSearchJob from "../models/RouteSearchJob";
import {
  registerConnection,
  removeConnection,
  subscribeToJob,
} from "./connectionManager";

export function initWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", (socket, req) => {
    const userId = getUserFromRequest(req);

    if (!userId) {
      socket.close(1008, "Unauthorized");
      return;
    }

    registerConnection(userId, socket);
    socket.send(JSON.stringify({ type: "auth_ok" }));

    socket.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;

        if (msg.type === "ping") {
          return;
        }

        if (msg.type === "subscribe") {
          if (!msg.jobId || typeof msg.jobId !== "string") {
            socket.send(JSON.stringify({
              type: "error",
              message: "jobId is required",
            }));
            return;
          }

          const job = await RouteSearchJob.findOne({ _id: msg.jobId, userId });
          if (!job) {
            socket.send(JSON.stringify({
              type: "error",
              message: "Job not found",
            }));
            return;
          }

          subscribeToJob(msg.jobId, socket);
          socket.send(JSON.stringify({
            type: "subscribed",
            jobId: msg.jobId,
          }));
          socket.send(JSON.stringify({
            type: "status_update",
            jobId: msg.jobId,
            status: job.status,
            progress: job.progress,
            message: job.errorMessage,
          }));
        }
      } catch {
        socket.send(JSON.stringify({
          type: "error",
          message: "Invalid JSON",
        }));
      }
    });

    socket.on("close", () => {
      removeConnection(socket);
    });

    socket.on("error", () => {
      removeConnection(socket);
    });
  });
}
