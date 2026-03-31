import { MongoServerError } from "mongodb";
import RouteSearchJob from "../models/RouteSearchJob";
import { publishRouteSearchRequested } from "../messaging/routeSearchMessaging";

async function publishRequestIfNeeded(
  job: {
    _id: unknown;
    userId: unknown;
    fromCityId: string;
    toCityId: string;
    requestPublishedAt?: Date | null;
  }
): Promise<void> {
  if (job.requestPublishedAt) return;
  await publishRouteSearchRequested({
    jobId: String(job._id),
    userId: String(job.userId),
    fromCityId: job.fromCityId,
    toCityId: job.toCityId,
    requestedAt: new Date().toISOString(),
  });
  await RouteSearchJob.updateOne(
    { _id: job._id },
    { $set: { requestPublishedAt: new Date(), status: "CREATED", progress: 0 } }
  );
}

export async function createOrGetRouteSearchJob(
  userId: string,
  idempotencyKey: string,
  fromCityId: string,
  toCityId: string
) {
  const existing = await RouteSearchJob.findOne({ userId, idempotencyKey });
  if (existing) {
    await publishRequestIfNeeded(existing);
    return { job: existing, statusCode: 200 };
  }
  try {
    const job = await RouteSearchJob.create({
      userId,
      idempotencyKey,
      fromCityId,
      toCityId,
      status: "CREATED",
      progress: 0,
    });
    await publishRequestIfNeeded(job);
    return { job, statusCode: 202 };
  } catch (err: unknown) {
    if (err instanceof MongoServerError && err.code === 11000) {
      const race = await RouteSearchJob.findOne({ userId, idempotencyKey });
      if (!race) throw err;
      await publishRequestIfNeeded(race);
      return { job: race, statusCode: 200 };
    }
    throw err;
  }
}
