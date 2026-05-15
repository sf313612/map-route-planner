import { getAccessToken } from "./api";
import type { ClientMessage, ServerMessage } from "../types/ws";

type MessageHandler = (message: ServerMessage) => void;
export type SocketConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type StatusHandler = (status: SocketConnectionStatus) => void;

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
        .replace(/^https:\/\//, "wss://")
        .replace(/^http:\/\//, "ws://")
    : "ws://localhost:5000");

export class SocketService {
  private socket: WebSocket | null = null;
  private handler: MessageHandler | null = null;
  private statusHandler: StatusHandler | null = null;
  private pendingMessages: ClientMessage[] = [];
  private subscriptions = new Set<string>();
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this.clearReconnectTimer();
    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    this.socket = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
      this.subscriptions.forEach((jobId) => {
        this.pendingMessages.push({ type: "subscribe", jobId });
      });
      this.pendingMessages.forEach((message) => this.send(message));
      this.pendingMessages = [];
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handler?.(message);
    };

    this.socket.onclose = () => {
      this.socket = null;

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.setStatus("disconnected");
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  onMessage(handler: MessageHandler) {
    this.handler = handler;
  }

  onStatus(handler: StatusHandler) {
    this.statusHandler = handler;
  }

  send(message: ClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push(message);
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  subscribe(jobId: string) {
    const isAlreadySubscribed = this.subscriptions.has(jobId);
    this.subscriptions.add(jobId);

    if (!isAlreadySubscribed && this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: "subscribe", jobId });
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.pendingMessages = [];
    this.setStatus("disconnected");
  }

  private scheduleReconnect() {
    if (!this.token || this.reconnectTimer !== null) {
      return;
    }

    this.reconnectAttempts += 1;
    this.setStatus("reconnecting");

    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 10000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;

      if (this.token && this.shouldReconnect) {
        this.connect(this.token);
      }
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: SocketConnectionStatus) {
    this.statusHandler?.(status);
  }
}

export async function connectJobSocket() {
  const token = await getAccessToken();
  const socketService = new SocketService();
  socketService.connect(token);
  return socketService;
}
