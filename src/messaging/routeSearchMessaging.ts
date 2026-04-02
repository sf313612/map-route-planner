import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import {
  assertRouteSearchTopology,
  getRouteSearchBackendEventsQueue,
  getRouteSearchExchange,
  ROUTE_SEARCH_COMPLETED,
  ROUTE_SEARCH_FAILED,
  ROUTE_SEARCH_PROGRESS,
  ROUTE_SEARCH_REQUESTED,
} from "./routeSearchQueue";

export interface RouteSearchRequestedPayload {
  jobId: string;
  userId: string;
  fromCityId: string;
  toCityId: string;
  requestedAt: string;
}

export interface RouteSearchProgressPayload {
  jobId: string;
  progress: number;
  stage: string;
  updatedAt: string;
}

export interface RouteSearchCompletedPayload {
  jobId: string;
  result: unknown;
  completedAt: string;
}

export interface RouteSearchFailedPayload {
  jobId: string;
  message: string;
  failedAt: string;
}

type RouteSearchEventMessage =
  | { type: typeof ROUTE_SEARCH_PROGRESS; payload: RouteSearchProgressPayload }
  | { type: typeof ROUTE_SEARCH_COMPLETED; payload: RouteSearchCompletedPayload }
  | { type: typeof ROUTE_SEARCH_FAILED; payload: RouteSearchFailedPayload };

let publisherConnection: ChannelModel | null = null;
let publisherChannel: Channel | null = null;
let consumerConnection: ChannelModel | null = null;
let consumerChannel: Channel | null = null;

function getUrl(): string {
  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error("RABBITMQ_URL is not set");
  return url;
}

export async function connectRouteSearchPublisher(): Promise<void> {
  if (publisherChannel) return;
  const conn = await amqp.connect(getUrl());
  const ch = await conn.createChannel();
  await assertRouteSearchTopology(ch);
  publisherConnection = conn;
  publisherChannel = ch;
}

export async function publishRouteSearchRequested(
  payload: RouteSearchRequestedPayload
): Promise<void> {
  if (!publisherChannel) throw new Error("Route search publisher is not initialized");
  publisherChannel.publish(
    getRouteSearchExchange(),
    ROUTE_SEARCH_REQUESTED,
    Buffer.from(JSON.stringify(payload), "utf8"),
    { persistent: true, contentType: "application/json" }
  );
}

function parseEvent(msg: ConsumeMessage): RouteSearchEventMessage {
  const payload = JSON.parse(msg.content.toString("utf8")) as unknown;
  const key = msg.fields.routingKey;
  if (key === ROUTE_SEARCH_PROGRESS) {
    return { type: ROUTE_SEARCH_PROGRESS, payload: payload as RouteSearchProgressPayload };
  }
  if (key === ROUTE_SEARCH_COMPLETED) {
    return { type: ROUTE_SEARCH_COMPLETED, payload: payload as RouteSearchCompletedPayload };
  }
  if (key === ROUTE_SEARCH_FAILED) {
    return { type: ROUTE_SEARCH_FAILED, payload: payload as RouteSearchFailedPayload };
  }
  throw new Error(`Unsupported route-search event: ${key}`);
}

export async function startRouteSearchEventsConsumer(
  onEvent: (event: RouteSearchEventMessage) => Promise<void>
): Promise<void> {
  if (consumerChannel) return;
  const conn = await amqp.connect(getUrl());
  const ch = await conn.createChannel();
  await assertRouteSearchTopology(ch);
  await ch.prefetch(Number(process.env.ROUTE_SEARCH_BACKEND_PREFETCH) || 10);
  const queue = getRouteSearchBackendEventsQueue();
  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const event = parseEvent(msg);
      await onEvent(event);
      ch.ack(msg);
    } catch (e) {
      console.error("Route-search event processing failed", e);
      ch.nack(msg, false, true);
    }
  });
  consumerConnection = conn;
  consumerChannel = ch;
}

export async function closeRouteSearchMessaging(): Promise<void> {
  try {
    if (consumerChannel) await consumerChannel.close();
  } catch (e) {
    console.error("Failed to close route-search consumer channel", e);
  } finally {
    consumerChannel = null;
  }
  try {
    if (consumerConnection) await consumerConnection.close();
  } catch (e) {
    console.error("Failed to close route-search consumer connection", e);
  } finally {
    consumerConnection = null;
  }
  try {
    if (publisherChannel) await publisherChannel.close();
  } catch (e) {
    console.error("Failed to close route-search publisher channel", e);
  } finally {
    publisherChannel = null;
  }
  try {
    if (publisherConnection) await publisherConnection.close();
  } catch (e) {
    console.error("Failed to close route-search publisher connection", e);
  } finally {
    publisherConnection = null;
  }
}
