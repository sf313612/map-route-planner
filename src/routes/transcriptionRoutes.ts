//
import express, { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";
import TranscriptionJob from "../models/TranscriptionJob";
import { createOrGetQueuedJob } from "../services/transcriptionJobService";
import { getTranscriptionResult } from "../storage/s3Storage";

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

    const storageResult = await getTranscriptionResult(job.s3Key);
    res.setHeader("Content-Type", storageResult.contentType);
    res.setHeader("Content-Length", storageResult.body.byteLength.toString());
    return res.status(200).send(storageResult.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get result" });
  }
});

export default router;