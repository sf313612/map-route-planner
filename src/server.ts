/// <reference path="./express.d.ts" />
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import authRouter from "./routes/authRoutes";
import usersRouter from "./routes/users";
import favoriteRouter from "./routes/favoriteRoute";
import savedRouter from "./routes/savedRoute";
import citiesRouter from "./routes/citiesRoutes";
import roadsRouter from "./routes/roadsRoutes";
import { closeNeo4jDriver } from "./neo4jClient";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error", err));

app.get("/", (req: Request, res: Response) => {
  res.send("API is running");
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/saved", savedRouter);
app.use("/api/cities", citiesRouter);
app.use("/api/roads", roadsRouter);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  server.close();
  await closeNeo4jDriver();
  process.exit(0);
});
