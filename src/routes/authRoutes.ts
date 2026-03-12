import express from "express";
import { issueToken } from "./auth";

const router = express.Router();
router.post("/token", issueToken);
export default router;
