/// <reference path="./express.d.ts" />
import express, { Request, Response } from "express";
import cors from "cors";

import authRouter from "./routes/authRoutes";
import usersRouter from "./routes/users";
import favoriteRouter from "./routes/favoriteRoute";
import savedRouter from "./routes/savedRoute";
import citiesRouter from "./routes/citiesRoutes";
import roadsRouter from "./routes/roadsRoutes";
import transcriptionRouter from "./routes/transcriptionRoutes";
import routeSearchRouter from "./routes/routeSearchRoutes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (req: Request, res: Response) => {
    res.send("API is running");
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/favorites", favoriteRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api/cities", citiesRouter);
  app.use("/api/roads", roadsRouter);
  app.use("/api/transcription", transcriptionRouter);
  app.use("/api/route-search", routeSearchRouter);

  return app;
}

