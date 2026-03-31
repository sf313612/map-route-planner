import { getChannel } from "./rabbitmq";
import TranscriptionJob from "../models/TranscriptionJob";

const RESULTS_QUEUE = "transcription.results";
const EXCHANGE = "app.events";
const ROUTING_KEY = "transcription.result";

export const startResultConsumer = async () => {
  const channel = getChannel();

  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  await channel.assertQueue(RESULTS_QUEUE, { durable: true });
  await channel.bindQueue(RESULTS_QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(RESULTS_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      await TranscriptionJob.findByIdAndUpdate(data.jobId, {
        status: data.status,
        resultText: data.resultText
      });

      channel.ack(msg);
    } catch (err) {
      console.error(err);
      channel.nack(msg, false, false);
    }
  });

  console.log("Result consumer started...");
};