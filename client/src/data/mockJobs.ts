import type { Job } from "../types/job";

export const mockJobs: Job[] = [
  {
    jobId: "job-1",
    fromCityId: "kyiv",
    toCityId: "lviv",
    status: "CREATED",
    progress: 0,
  },
  {
    jobId: "job-2",
    fromCityId: "odesa",
    toCityId: "dnipro",
    status: "PROCESSING",
    progress: 45,
  },
];
