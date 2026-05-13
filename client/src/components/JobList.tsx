import type { Job } from "../types/job";
import { JobCard } from "./JobCard";

type JobListProps = {
  jobs: Job[];
};

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return <p className="job-list__empty">No jobs yet</p>;
  }

  return (
    <section className="job-list">
      {jobs.map((job) => (
        <JobCard key={job.jobId} job={job} />
      ))}
    </section>
  );
}
