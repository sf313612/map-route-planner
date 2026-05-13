import type { ClientMessage, ServerMessage } from "../types/ws";

type MessageHandler = (message: ServerMessage) => void;

export class SocketService {
  private socket: WebSocket | null = null;
  private handler: MessageHandler | null = null;

  connect(token: string) {
    this.socket = new WebSocket(`ws://localhost:5000/ws?token=${token}`);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handler?.(message);
    };
  }

  onMessage(handler: MessageHandler) {
    this.handler = handler;
  }

  send(message: ClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  subscribe(jobId: string) {
    this.send({ type: "subscribe", jobId });
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}
