export type JobStatus = "CREATED" | "PROCESSING" | "DONE" | "ERROR";

export type Job = {
  jobId: string;
  fromCityId: string;
  toCityId: string;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  result?: unknown;
};
