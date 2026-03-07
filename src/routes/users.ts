import express from "express";
import User from "../models/User";

const router = express.Router();

// CREATE user
router.post("/", async (req, res) => {
    const user = new User(req.body);
    const saved = await user.save();
    res.json(saved);
  });
  
  // READ all users
  router.get("/", async (req, res) => {
    const users = await User.find();
    res.json(users);
  });
  
  // READ one user
  router.get("/:id", async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
  });
  
  // UPDATE user
  router.put("/:id", async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  });
  
  // DELETE user
  router.delete("/:id", async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  });
  
  export default router;