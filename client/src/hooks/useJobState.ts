import { useEffect, useState } from "react";
import { mockJobs } from "../data/mockJobs";
import type { Job } from "../types/job";

const STORAGE_KEY = "route-search-jobs";

function readJobsFromStorage(): Job[] {
  if (typeof window === "undefined") {
    return mockJobs;
  }

  const savedJobs = window.localStorage.getItem(STORAGE_KEY);

  if (!savedJobs) {
    return mockJobs;
  }

  try {
    const parsedJobs = JSON.parse(savedJobs) as Job[];

    if (!Array.isArray(parsedJobs)) {
      return mockJobs;
    }

    return parsedJobs;
  } catch {
    return mockJobs;
  }
}

type CreateJobInput = {
  fromCityId: string;
  toCityId: string;
};

export function useJobState() {
  const [jobs, setJobs] = useState<Job[]>(() => readJobsFromStorage());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const addJob = ({ fromCityId, toCityId }: CreateJobInput) => {
    const newJob: Job = {
      jobId: `job-${Date.now()}`,
      fromCityId,
      toCityId,
      status: "CREATED",
      progress: 0,
    };

    setJobs((currentJobs) => [newJob, ...currentJobs]);
  };

  return {
    jobs,
    addJob,
  };
}
