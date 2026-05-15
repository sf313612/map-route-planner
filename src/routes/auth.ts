import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { getSecret } from "../middleware/auth";

const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";

function signUserToken(userId: string, isGuest = false): string {
  return jwt.sign(
    { userId, isGuest },
    getSecret(),
    { expiresIn: "7d" }
  );
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): string {
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;

  const [iterationsText, salt, hash] = storedHash.split(":");
  const iterations = Number(iterationsText);

  if (!iterations || !salt || !hash) return false;

  const attemptedHash = crypto
    .pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attemptedHash, "hex"));
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function authResponse(user: { _id: unknown; username?: string; email?: string }) {
  const userId = String(user._id);
  return {
    token: signUserToken(userId),
    userId,
    username: user.username,
    email: user.email,
  };
}

export async function issueToken(_req: Request, res: Response): Promise<void> {
  try {
    const userId = crypto.randomBytes(12).toString("hex");
    res.status(201).json({
      data: {
        token: signUserToken(userId, true),
        userId,
        isGuest: true,
      },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to issue token" });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const username = normalizeText(req.body?.username);
  const email = normalizeEmail(req.body?.email);
  const password = normalizeText(req.body?.password);

  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    const user = new User({
      username,
      email,
      passwordHash: hashPassword(password),
    });
    const saved = await user.save();

    res.status(201).json({ data: authResponse(saved) });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body?.email);
  const password = normalizeText(req.body?.password);

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const user = await User.findOne({ email });

    const passwordHash =
      typeof user?.passwordHash === "string" ? user.passwordHash : undefined;

    if (!user || !verifyPassword(password, passwordHash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.json({ data: authResponse(user) });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to log in" });
  }
}
