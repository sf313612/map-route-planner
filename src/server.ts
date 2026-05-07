import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer, type Server } from "http";
import { createApp } from "./app";
import { closeNeo4jDriver } from "./neo4jClient";
import { closeRabbitMQ, connectRabbitMQ } from "./messaging/rabbitmq";
import {
  closeRouteSearchMessaging,
  connectRouteSearchPublisher,
  startRouteSearchEventsConsumer,
} from "./messaging/routeSearchMessaging";
import { handleRouteSearchEvent } from "./services/routeSearchEventHandler";
import { initWebSocketServer } from "./ws/server";

dotenv.config();

const app = createApp();

const PORT = process.env.PORT || 5000;
let server: Server;

async function bootstrap(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("MongoDB connected");
  await connectRabbitMQ();
  console.log("RabbitMQ connected");
  await connectRouteSearchPublisher();
  await startRouteSearchEventsConsumer(handleRouteSearchEvent);
  console.log("Route-search messaging connected");

  server = createServer(app);
  initWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  if (server) {
    server.close();
  }
  await closeRouteSearchMessaging();
  await closeRabbitMQ();
  await mongoose.connection.close();
  await closeNeo4jDriver();
  process.exit(0);
});
