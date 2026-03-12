import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { getSecret } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

export async function issueToken(_req: Request, res: Response): Promise<void> {
  try {
    const id = uuidv4();
    const username = `user_${id.slice(0, 8)}`;
    const email = `user_${id}@token.local`;
    const user = new User({ username, email });
    const saved = await user.save();
    const token = jwt.sign(
      { userId: saved._id.toString() },
      getSecret(),
      { expiresIn: "7d" }
    );
    res.status(201).json({
      data: { token, userId: saved._id.toString() },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to issue token" });
  }
}
