import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import TranscriptionJob from "../models/TranscriptionJob";
import { createConsumerConnection } from "../messaging/rabbitmq";
import type { TranscriptionRequestPayload } from "../messaging/rabbitmq";
import { getQueueName } from "../messaging/transcriptionQueue";

let rabbitConnection: ChannelModel | null = null;
let rabbitChannel: Channel | null = null;

const STUB_DELAY_MS = Number(process.env.TRANSCRIPTION_STUB_DELAY_MS) || 1500;

function parsePayload(msg: ConsumeMessage): TranscriptionRequestPayload {
  const raw = JSON.parse(msg.content.toString("utf8")) as unknown;
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as TranscriptionRequestPayload).jobId !== "string" ||
    typeof (raw as TranscriptionRequestPayload).userId !== "string" ||
    typeof (raw as TranscriptionRequestPayload).sourceText !== "string"
  ) {
    throw new Error("Invalid transcription message payload");
  }
  return raw as TranscriptionRequestPayload;
}

async function processJob(payload: TranscriptionRequestPayload): Promise<void> {
  const job = await TranscriptionJob.findById(payload.jobId);
  if (!job) {
    console.warn("[worker] Job not found:", payload.jobId);
    return;
  }
  if (String(job.userId) !== payload.userId) {
    console.warn("[worker] userId mismatch for job", payload.jobId);
    return;
  }
  if (job.status === "DONE" || job.status === "FAILED") {
    return;
  }

  await TranscriptionJob.findByIdAndUpdate(payload.jobId, { status: "PROCESSING" });
  await new Promise<void>((resolve) => setTimeout(resolve, STUB_DELAY_MS));
  await TranscriptionJob.findByIdAndUpdate(payload.jobId, {
    status: "DONE",
    resultText: `[stub transcription] ${job.sourceText}`,
  });
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }
  await mongoose.connect(mongoUri);
  console.log("[worker] MongoDB connected");

  const consumer = await createConsumerConnection();
  rabbitConnection = consumer.connection;
  rabbitChannel = consumer.channel;
  const { channel } = consumer;
  const queue = getQueueName();

  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = parsePayload(msg);
      await processJob(payload);
      channel.ack(msg);
    } catch (e) {
      console.error("[worker] message failed:", e);
      channel.nack(msg, false, true);
    }
  });

  console.log("[worker] Consuming queue:", queue);
}

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[worker] Shutting down...");
  try {
    if (rabbitChannel) await rabbitChannel.close();
  } catch (e) {
    console.error(e);
  }
  rabbitChannel = null;
  try {
    if (rabbitConnection) await rabbitConnection.close();
  } catch (e) {
    console.error(e);
  }
  rabbitConnection = null;
  await mongoose.connection.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
