import express from "express";
import FavoriteRoute from "../models/FavoriteRoute";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  const route = new FavoriteRoute(req.body);
  const saved = await route.save();
  res.json(saved);
});

// READ
router.get("/", async (req, res) => {
  const routes = await FavoriteRoute.find();
  res.json(routes);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await FavoriteRoute.findByIdAndDelete(req.params.id);
  res.json({ message: "Favorite removed" });
});

export default router;