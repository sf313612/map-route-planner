import express, { Request, Response } from "express";
import FavoriteRoute from "../models/FavoriteRoute";

import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";

const router = express.Router();
router.use(requireAuth);

// CREATE
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const route = new FavoriteRoute({ ...req.body, userId});
    const saved = await route.save();
    res.status(201).json({ data: saved});
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to create favorite route" });
  }
});

// READ all favorites for this user
router.get("/", async (req: Request, res: Response) => {
  try {
    const list = await FavoriteRoute.find({ userId: req.userId });
    res.json({ data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list favorite routes" });
  }
});

// READ single
router.get("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await FavoriteRoute.findOne({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Favorite route not found" });
    res.json({ data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get favorite route" });
  }
});

// UPDATE
router.put("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await FavoriteRoute.findOneAndUpdate({ _id: id, userId: req.userId }, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Favorite route not found" });
    res.json({ data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update favorite route" });
  }
});

// DELETE
router.delete("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await FavoriteRoute.findOneAndDelete({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Favorite route not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete favorite route" });
  }
});

export default router;