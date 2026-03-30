import amqp, { type Channel, type ChannelModel } from "amqplib";
import {
  assertTranscriptionTopology,
  getExchangeName,
  TRANSCRIPTION_ROUTING_KEY,
} from "./transcriptionQueue";

export interface TranscriptionRequestPayload {
  jobId: string;
  userId: string;
  sourceText: string;
}

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

function getUrl(): string {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error("RABBITMQ_URL is not set");
  }
  return url;
}

export async function connectRabbitMQ(): Promise<void> {
  if (channel) return;
  const conn = await amqp.connect(getUrl());
  connection = conn;
  const ch = await conn.createChannel();
  await assertTranscriptionTopology(ch);
  channel = ch;
}

export async function publishTranscriptionRequest(payload: TranscriptionRequestPayload): Promise<void> {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  channel.publish(getExchangeName(), TRANSCRIPTION_ROUTING_KEY, body, {
    persistent: true,
    contentType: "application/json",
  });
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
  } catch (e) {
    console.error("Error closing RabbitMQ channel", e);
  } finally {
    channel = null;
  }
  try {
    if (connection) {
      await connection.close();
    }
  } catch (e) {
    console.error("Error closing RabbitMQ connection", e);
  } finally {
    connection = null;
  }
}

/** For worker: own ChannelModel + channel + topology (separate process). */
export async function createConsumerConnection(): Promise<{ connection: ChannelModel; channel: Channel }> {
  const conn = await amqp.connect(getUrl());
  const ch = await conn.createChannel();
  await assertTranscriptionTopology(ch);
  await ch.prefetch(Number(process.env.TRANSCRIPTION_WORKER_PREFETCH) || 5);
  return { connection: conn, channel: ch };
}
