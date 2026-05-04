export type ClientMessage =
  | { type: "subscribe"; jobId: string }
  | { type: "ping" };

export type ServerMessage =
  | { type: "auth_ok" }
  | { type: "subscribed"; jobId: string }
  | { type: "progress"; jobId: string; progress: number }
  | { type: "completion"; jobId: string; status: string }
  | { type: "error"; message: string };
