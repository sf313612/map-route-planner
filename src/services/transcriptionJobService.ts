//
import { MongoServerError } from "mongodb";
import TranscriptionJob from "../models/TranscriptionJob";
import { publishTranscriptionRequest } from "../messaging/rabbitmq";

// is job sent
async function publishIfNeeded(
  job: { _id: unknown; sourceText: string; publishedAt?: Date | null },
  userId: string
): Promise<void> {

  // if sent - do nothing
  if (job.publishedAt) return;

  // sent job
  await publishTranscriptionRequest({
    jobId: String(job._id),
    userId,
    sourceText: job.sourceText,
  });

  // add data not to sent twice
  await TranscriptionJob.updateOne({ _id: job._id }, { $set: { publishedAt: new Date() } });
}

// find job
export async function createOrGetQueuedJob(
  userId: string,
  idempotencyKey: string,
  sourceText: string
) {

  // return if found
  const existing = await TranscriptionJob.findOne({ userId, idempotencyKey });
  if (existing) {
    await publishIfNeeded(existing, userId);
    return { job: existing, statusCode: 200 };
  }

  try {

    // create job
    const job = await TranscriptionJob.create({
      userId,
      idempotencyKey,
      sourceText,
      status: "QUEUED",

      // metadata defaults
      s3Key: null,
      contentType: null,
      size: null,
      resultStatus: "NOT_READY",
    });

    // sent to queue
    await publishIfNeeded(job, userId);
    return { job, statusCode: 202 };
  } catch (err: unknown) {

    // return one job if two created
    if (err instanceof MongoServerError && err.code === 11000) {
      const race = await TranscriptionJob.findOne({ userId, idempotencyKey });
      if (!race) throw err;
      await publishIfNeeded(race, userId);
      return { job: race, statusCode: 200 };
    }
    throw err;
  }
}
