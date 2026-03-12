import express, { Request, Response } from "express";
import SavedRoute from "../models/SavedRoute";

import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";

const router = express.Router();
router.use(requireAuth);

// CREATE
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  try{
    const route = new SavedRoute({ ...req.body, userId});
    const saved = await route.save();
    res.status(201).json({ data: saved});
  }catch (err){
    console.error(err);
    res.status(500).json({error: "Failed to create saved route"});
  }
});

// READ all
router.get("/", async (req: Request, res: Response)  => {
  try{
    const routes = await SavedRoute.find({ userId: req.userId });
    res.json({ data: routes });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: "Failed to list saved routes"});
  }
});

// READ single
router.get("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await SavedRoute.findOne({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Saved route not found" });
    res.json({ data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get saved route" });
  }
});

// UPDATE
router.put("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await SavedRoute.findOneAndUpdate({ _id: id, userId: req.userId }, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Saved route not found" });
    res.json({ data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update saved route" });
  }
});

// DELETE
router.delete("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const doc = await SavedRoute.findOneAndDelete({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Saved route not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete saved route" });
  }
});

export default router;
