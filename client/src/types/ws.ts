import type { RouteSearchResult } from "./job";

export type ClientMessage =
  | { type: "subscribe"; jobId: string }
  | { type: "ping" };

export type ServerMessage =
  | { type: "auth_ok" }
  | { type: "subscribed"; jobId: string }
  | { type: "progress"; jobId: string; progress: number; stage?: string }
  | { type: "status_update"; jobId: string; status: string; progress?: number; message?: string }
  | { type: "completion"; jobId: string; status: string; result?: RouteSearchResult; message?: string }
  | { type: "error"; message: string };
