import express from "express";
import { issueToken, login, register } from "./auth";

const router = express.Router();
router.post("/token", issueToken);
router.post("/register", register);
router.post("/login", login);
export default router;
