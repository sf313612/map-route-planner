import RouteSearchJob from "../models/RouteSearchJob";
import {
  ROUTE_SEARCH_COMPLETED,
  ROUTE_SEARCH_FAILED,
  ROUTE_SEARCH_PROGRESS,
} from "../messaging/routeSearchQueue";
import type {
  RouteSearchCompletedPayload,
  RouteSearchFailedPayload,
  RouteSearchProgressPayload,
} from "../messaging/routeSearchMessaging";

export async function handleRouteSearchEvent(event: {
  type: string;
  payload: RouteSearchProgressPayload | RouteSearchCompletedPayload | RouteSearchFailedPayload;
}): Promise<void> {
  if (event.type === ROUTE_SEARCH_PROGRESS) {
    const payload = event.payload as RouteSearchProgressPayload;
    await RouteSearchJob.findByIdAndUpdate(payload.jobId, {
      status: "PROCESSING",
      progress: Math.max(0, Math.min(99, Number(payload.progress) || 0)),
    });
    return;
  }

  if (event.type === ROUTE_SEARCH_COMPLETED) {
    const payload = event.payload as RouteSearchCompletedPayload;
    await RouteSearchJob.findByIdAndUpdate(payload.jobId, {
      status: "DONE",
      progress: 100,
      result: payload.result,
      errorMessage: null,
    });
    return;
  }

  if (event.type === ROUTE_SEARCH_FAILED) {
    const payload = event.payload as RouteSearchFailedPayload;
    await RouteSearchJob.findByIdAndUpdate(payload.jobId, {
      status: "ERROR",
      errorMessage: payload.message || "Background worker failed",
    });
  }
}
