import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import usersRoutes from "./routes/users";
import favoriteRoutes from "./routes/favoriteRoute";
import savedRoutes from "./routes/savedRoute";

import { Request, Response } from "express";
dotenv.config();

const app = express();
app.use(express.json());
app.use("/api/users", usersRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/saved", savedRoutes);

// Connecting MongoDB
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.get("/", (req:Request, res:Response) => {
  res.send("API is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
