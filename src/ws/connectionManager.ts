import { WebSocket } from "ws";
import type { ServerMessage } from "./types";

type AuthedSocket = WebSocket & {
  userId?: string;
};

const userSockets = new Map<string, Set<WebSocket>>();
const jobSubscriptions = new Map<string, Set<WebSocket>>();

function send(socket: WebSocket, data: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

export function registerConnection(userId: string, socket: WebSocket): void {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId)!.add(socket);
  (socket as AuthedSocket).userId = userId;
}

export function removeConnection(socket: WebSocket): void {
  const userId = (socket as AuthedSocket).userId;

  if (userId) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        userSockets.delete(userId);
      }
    }
  }

  for (const [jobId, subs] of jobSubscriptions.entries()) {
    subs.delete(socket);
    if (subs.size === 0) {
      jobSubscriptions.delete(jobId);
    }
  }
}

export function subscribeToJob(jobId: string, socket: WebSocket): void {
  if (!jobSubscriptions.has(jobId)) {
    jobSubscriptions.set(jobId, new Set());
  }

  jobSubscriptions.get(jobId)!.add(socket);
}

export function publishToUser(userId: string, data: ServerMessage): void {
  const sockets = userSockets.get(userId);
  if (!sockets) return;

  sockets.forEach((socket) => send(socket, data));
}

export function publishToJob(jobId: string, data: ServerMessage): void {
  const sockets = jobSubscriptions.get(jobId);
  if (!sockets) return;

  sockets.forEach((socket) => send(socket, data));
}
