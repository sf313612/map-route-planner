import type { Job } from "../types/job";
import { StatusBadge } from "./StatusBadge";

type JobCardProps = {
  job: Job;
};

export function JobCard({ job }: JobCardProps) {
  return (
    <article className="job-card">
      <div className="job-card__header">
        <h3 className="job-card__title">{job.jobId}</h3>
        <StatusBadge status={job.status} />
      </div>

      <p className="job-card__route">
        {job.fromCityId} {"->"} {job.toCityId}
        </p>


      <p className="job-card__progress">Progress: {job.progress}%</p>
    </article>
  );
}
