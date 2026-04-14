//
import type { Channel } from "amqplib";

export const ROUTE_SEARCH_REQUESTED = "route_search.requested";
export const ROUTE_SEARCH_PROGRESS = "route_search.progress";
export const ROUTE_SEARCH_COMPLETED = "route_search.completed";
export const ROUTE_SEARCH_FAILED = "route_search.failed";

export function getRouteSearchExchange(): string {
  return process.env.ROUTE_SEARCH_EXCHANGE || "app.events";
}

export function getRouteSearchRequestQueue(): string {
  return process.env.ROUTE_SEARCH_REQUEST_QUEUE || "route-search.requests";
}

export function getRouteSearchBackendEventsQueue(): string {
  return process.env.ROUTE_SEARCH_EVENTS_QUEUE || "route-search.backend.events";
}

export async function assertRouteSearchTopology(channel: Channel): Promise<void> {
  const exchange = getRouteSearchExchange();
  const requestQueue = getRouteSearchRequestQueue();
  const backendEventsQueue = getRouteSearchBackendEventsQueue();

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(requestQueue, { durable: true });
  await channel.assertQueue(backendEventsQueue, { durable: true });

  await channel.bindQueue(requestQueue, exchange, ROUTE_SEARCH_REQUESTED);
  await channel.bindQueue(backendEventsQueue, exchange, ROUTE_SEARCH_PROGRESS);
  await channel.bindQueue(backendEventsQueue, exchange, ROUTE_SEARCH_COMPLETED);
  await channel.bindQueue(backendEventsQueue, exchange, ROUTE_SEARCH_FAILED);
}
