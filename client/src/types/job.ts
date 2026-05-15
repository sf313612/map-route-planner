export type JobStatus = "CREATED" | "PROCESSING" | "DONE" | "ERROR";

export type RouteSearchResult = {
  pathCityIds?: string[];
  totalTravelTime?: number;
};

export type Job = {
  jobId: string;
  fromCityId: string;
  toCityId: string;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  result?: RouteSearchResult;
  createdAt?: string;
  updatedAt?: string;
};
