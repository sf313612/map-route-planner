import type { Channel } from "amqplib";

export const TRANSCRIPTION_ROUTING_KEY = "transcription.request";

export function getExchangeName(): string {
  return process.env.RABBITMQ_EXCHANGE || "app.events";
}

export function getQueueName(): string {
  return process.env.RABBITMQ_QUEUE || "transcription.jobs";
}

export async function assertTranscriptionTopology(channel: Channel): Promise<void> {
  const exchange = getExchangeName();
  const queue = getQueueName();
  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, TRANSCRIPTION_ROUTING_KEY);
}
