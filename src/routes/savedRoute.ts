import express from "express";
import SavedRoute from "../models/SavedRoute";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  const route = new SavedRoute(req.body);
  const saved = await route.save();
  res.json(saved);
});

// READ
router.get("/", async (req, res) => {
  const routes = await SavedRoute.find();
  res.json(routes);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await SavedRoute.findByIdAndDelete(req.params.id);
  res.json({ message: "Route deleted" });
});

export default router;