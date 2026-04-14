//
import express, { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";
import TranscriptionJob from "../models/TranscriptionJob";
import { createOrGetQueuedJob } from "../services/transcriptionJobService";

const router = express.Router();
router.use(requireAuth);

// create job
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
    // call service
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

// get job
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

router.post("/jobs/:id/result", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { s3Key, contentType, size } = req.body;

  if (typeof s3Key !== "string" || !s3Key.trim()) {
  return res.status(400).json({ error: "s3Key is required" });
  }

  if (typeof contentType !== "string" || !contentType.trim()) {
    return res.status(400).json({ error: "contentType is required" });
  }

  if (typeof size !== "number" || size < 0) {
    return res.status(400).json({ error: "size must be a non-negative number" });
  }

  try {
    const job = await TranscriptionJob.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // only metadata update
    job.s3Key = s3Key;
    job.contentType = contentType;
    job.size = size;
    job.resultStatus = "READY";
    job.status = "DONE";

    await job.save();

    return res.json({ message: "Result metadata saved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save result metadata" });
  }
});

router.get("/jobs/:id/result", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const job = await TranscriptionJob.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // result not ready
    if (job.resultStatus !== "READY" || !job.s3Key) {
      return res.status(404).json({ error: "Result not ready" });
    }

    return res.json({
      data: {
        s3Key: job.s3Key,
        contentType: job.contentType,
        size: job.size,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get result" });
  }
});

export default router;