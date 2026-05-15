import express, { Request, Response } from "express";
import SavedRoute from "../models/SavedRoute";
import User from "../models/User";

import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";

const router = express.Router();
router.use(requireAuth);

async function isRegisteredUser(req: Request): Promise<boolean> {
  if (req.isGuest || !req.userId) {
    return false;
  }

  const user = await User.findById(req.userId).select("passwordHash").lean();
  return Boolean(user?.passwordHash);
}

async function requireRegisteredUser(req: Request, res: Response): Promise<boolean> {
  if (!(await isRegisteredUser(req))) {
    res.status(403).json({ error: "Login is required to save routes" });
    return false;
  }

  return true;
}

// CREATE
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  try{
    if (!(await requireRegisteredUser(req, res))) return;
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
    if (!(await isRegisteredUser(req))) {
      res.json({ data: [] });
      return;
    }

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
    if (!(await requireRegisteredUser(req, res))) return;
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
    if (!(await requireRegisteredUser(req, res))) return;
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
    if (!(await requireRegisteredUser(req, res))) return;
    const doc = await SavedRoute.findOneAndDelete({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Saved route not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete saved route" });
  }
});

export default router;
