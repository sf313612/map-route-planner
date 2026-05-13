import type { JobStatus } from "../types/job";

type StatusBadgeProps = {
  status: JobStatus;
};

const statusClassMap: Record<JobStatus, string> = {
  CREATED: "status-badge--created",
  PROCESSING: "status-badge--processing",
  DONE: "status-badge--done",
  ERROR: "status-badge--error",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${statusClassMap[status]}`}>
      {status}
    </span>
  );
}
