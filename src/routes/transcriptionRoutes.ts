import express, { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";
import TranscriptionJob from "../models/TranscriptionJob";
import { createOrGetQueuedJob } from "../services/transcriptionJobService";

const router = express.Router();
router.use(requireAuth);

router.post("/jobs", async (req: Request, res: Response) => {
  const rawSource = req.body?.sourceText;
  const sourceText = typeof rawSource === "string" ? rawSource.trim() : "";
  const headerKey = req.headers["idempotency-key"];
  const fromHeader = typeof headerKey === "string" ? headerKey.trim() : "";
  const bodyKey =
    typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : "";
  const idempotencyKey = fromHeader || bodyKey;

  if (!sourceText) {
    res.status(400).json({ error: "sourceText is required" });
    return;
  }
  if (!idempotencyKey) {
    res.status(400).json({
      error: "Provide Idempotency-Key header or idempotencyKey in JSON body",
    });
    return;
  }

  try {
    const { job, statusCode } = await createOrGetQueuedJob(
      req.userId!,
      idempotencyKey,
      sourceText
    );
    const createdAt = "createdAt" in job && job.createdAt ? job.createdAt : undefined;
    res.status(statusCode).json({
      data: {
        jobId: job._id,
        status: job.status,
        sourceText: job.sourceText,
        ...(createdAt !== undefined ? { createdAt } : {}),
      },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transcription job" });
  }
});

router.get("/jobs/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const job = await TranscriptionJob.findOne({ _id: id, userId: req.userId });
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ data: job });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to load job" });
  }
});

export default router;
