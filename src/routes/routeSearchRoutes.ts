//
import express, { Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getParamId } from "../utils/params";
import RouteSearchJob from "../models/RouteSearchJob";
import { createOrGetRouteSearchJob } from "../services/routeSearchJobService";

const router = express.Router();
router.use(requireAuth);

router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const jobs = await RouteSearchJob.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      data: jobs.map((job) => ({
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        fromCityId: job.fromCityId,
        toCityId: job.toCityId,
        result: job.result,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to load route-search jobs" });
  }
});

// create job
router.post("/jobs", async (req: Request, res: Response) => {
  const fromCityId = typeof req.body?.fromCityId === "string" ? req.body.fromCityId.trim() : "";
  const toCityId = typeof req.body?.toCityId === "string" ? req.body.toCityId.trim() : "";
  const headerKey = req.headers["idempotency-key"];
  const fromHeader = typeof headerKey === "string" ? headerKey.trim() : "";
  const fromBody =
    typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : "";
  const idempotencyKey = fromHeader || fromBody;

  if (!fromCityId || !toCityId) {
    res.status(400).json({ error: "fromCityId and toCityId are required" });
    return;
  }
  if (!idempotencyKey) {
    res.status(400).json({ error: "Provide Idempotency-Key header or idempotencyKey in body" });
    return;
  }

  try {
    const { job, statusCode } = await createOrGetRouteSearchJob(
      req.userId!,
      idempotencyKey,
      fromCityId,
      toCityId
    );
    res.status(statusCode).json({
      data: {
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        fromCityId: job.fromCityId,
        toCityId: job.toCityId,
      },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to create route-search job" });
  }
});

router.get("/jobs/:id", async (req: Request, res: Response) => {
  const id = getParamId(req);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const job = await RouteSearchJob.findOne({ _id: id, userId: req.userId });
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({
      data: {
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        fromCityId: job.fromCityId,
        toCityId: job.toCityId,
        result: job.result,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to load route-search job" });
  }
});

export default router;
