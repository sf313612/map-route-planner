import express, { Request, Response } from "express";
import { RoadDTO } from "../types";
import {
  createRoad,
  listRoads,
  updateRoad,
  deleteRoad,
} from "../services/roadService";
import { getParamId } from "../utils/params";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { fromCityId, toCityId, travelTime, type } = req.body as RoadDTO;
  if (!fromCityId || !toCityId) {
    return res.status(400).json({ error: "Fields 'fromCityId' and 'toCityId' are required" });
  }
  try {
    const road = await createRoad({
      fromCityId,
      toCityId,
      travelTime: typeof travelTime === "number" ? travelTime : undefined,
      type,
    });
    res.status(201).json({ data: road });
  } catch (err: unknown) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Failed to create road";
    res.status(400).json({ error: msg });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const roads = await listRoads();
    res.json({ data: roads });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to list roads" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const { travelTime, type } = req.body as Partial<RoadDTO>;
  if (travelTime === undefined && !type) {
    return res.status(400).json({ error: "At least one field must be provided for update" });
  }
  try {
    const updated = await updateRoad(id, {
      travelTime: typeof travelTime === "number" ? travelTime : undefined,
      type,
    });
    if (!updated) return res.status(404).json({ error: "Road not found" });
    res.json({ data: updated });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to update road" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const deleted = await deleteRoad(id);
    if (!deleted) return res.status(404).json({ error: "Road not found" });
    res.status(204).send();
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete road" });
  }
});

export default router;
