//
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
import { publishToJob } from "../ws/connectionManager";

export async function handleRouteSearchEvent(event: {
  type: string;
  payload: RouteSearchProgressPayload | RouteSearchCompletedPayload | RouteSearchFailedPayload;
}): Promise<void> {
  if (event.type === ROUTE_SEARCH_PROGRESS) {
    const payload = event.payload as RouteSearchProgressPayload;
    const progress = Math.max(0, Math.min(99, Number(payload.progress) || 0));
    await RouteSearchJob.findByIdAndUpdate(payload.jobId, {
      status: "PROCESSING",
      progress,
    });
    publishToJob(payload.jobId, {
      type: "progress",
      jobId: payload.jobId,
      progress,
      stage: payload.stage,
    });
    publishToJob(payload.jobId, {
      type: "status_update",
      jobId: payload.jobId,
      status: "PROCESSING",
      progress,
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
    publishToJob(payload.jobId, {
      type: "status_update",
      jobId: payload.jobId,
      status: "DONE",
      progress: 100,
    });
    publishToJob(payload.jobId, {
      type: "completion",
      jobId: payload.jobId,
      status: "DONE",
      result: payload.result,
    });
    return;
  }

  if (event.type === ROUTE_SEARCH_FAILED) {
    const payload = event.payload as RouteSearchFailedPayload;
    const message = payload.message || "Background worker failed";
    await RouteSearchJob.findByIdAndUpdate(payload.jobId, {
      status: "ERROR",
      errorMessage: message,
    });
    publishToJob(payload.jobId, {
      type: "status_update",
      jobId: payload.jobId,
      status: "ERROR",
      message,
    });
    publishToJob(payload.jobId, {
      type: "completion",
      jobId: payload.jobId,
      status: "ERROR",
      message,
    });
  }
}
