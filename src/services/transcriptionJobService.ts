import { MongoServerError } from "mongodb";
import TranscriptionJob from "../models/TranscriptionJob";
import { publishTranscriptionRequest } from "../messaging/rabbitmq";

async function publishIfNeeded(
  job: { _id: unknown; sourceText: string; publishedAt?: Date | null },
  userId: string
): Promise<void> {
  if (job.publishedAt) return;
  await publishTranscriptionRequest({
    jobId: String(job._id),
    userId,
    sourceText: job.sourceText,
  });
  await TranscriptionJob.updateOne({ _id: job._id }, { $set: { publishedAt: new Date() } });
}

export async function createOrGetQueuedJob(
  userId: string,
  idempotencyKey: string,
  sourceText: string
) {
  const existing = await TranscriptionJob.findOne({ userId, idempotencyKey });
  if (existing) {
    await publishIfNeeded(existing, userId);
    return { job: existing, statusCode: 200 };
  }

  try {
    const job = await TranscriptionJob.create({
      userId,
      idempotencyKey,
      sourceText,
      status: "QUEUED",
    });
    await publishIfNeeded(job, userId);
    return { job, statusCode: 202 };
  } catch (err: unknown) {
    if (err instanceof MongoServerError && err.code === 11000) {
      const race = await TranscriptionJob.findOne({ userId, idempotencyKey });
      if (!race) throw err;
      await publishIfNeeded(race, userId);
      return { job: race, statusCode: 200 };
    }
    throw err;
  }
}
