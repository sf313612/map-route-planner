import express, { Request, Response } from "express";
import { CityDTO } from "../types";
import {
  createCity,
  getCityById,
  listCities,
  updateCity,
  deleteCity,
} from "../services/cityService";
import { getParamId } from "../utils/params";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { name, lat, lng } = req.body as CityDTO;
  if (!name) return res.status(400).json({ error: "Field 'name' is required" });
  try {
    const city = await createCity({
      name,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    });
    res.status(201).json({ data: city });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to create city" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const cities = await listCities();
    res.json({ data: cities });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to list cities" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const city = await getCityById(id);
    if (!city) return res.status(404).json({ error: "City not found" });
    res.json({ data: city });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to get city" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const { name, lat, lng } = req.body as Partial<CityDTO>;
  if (!name && lat === undefined && lng === undefined) {
    return res.status(400).json({ error: "At least one field must be provided for update" });
  }
  try {
    const updated = await updateCity(id, {
      name,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    });
    if (!updated) return res.status(404).json({ error: "City not found" });
    res.json({ data: updated });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to update city" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const deleted = await deleteCity(id);
    if (!deleted) return res.status(404).json({ error: "City not found" });
    res.status(204).send();
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete city" });
  }
});

export default router;
