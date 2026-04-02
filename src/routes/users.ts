import express, { Request, Response } from "express";
import User from "../models/User";
import { getParamId } from "../utils/params";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Fields 'username', 'email' and 'password' are required" });
  }
  try {
    const user = new User({ username, email, password });
    const saved = await user.save();
    res.status(201).json({ data: saved });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json({ data: users });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ data: user });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ data: user });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(204).send();
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
