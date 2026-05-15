import type { Job } from "../types/job";
import type { City } from "../types/city";
import type { SavedRoute } from "../types/savedRoute";
import { JobCard } from "./JobCard";

type JobListProps = {
  citiesById: Map<string, City>;
  canSaveRoutes: boolean;
  isSavingRoute: boolean;
  jobs: Job[];
  onSaveRoute: (job: Job) => Promise<void>;
  savedRoutes: SavedRoute[];
};

export function JobList({
  citiesById,
  canSaveRoutes,
  isSavingRoute,
  jobs,
  onSaveRoute,
  savedRoutes,
}: JobListProps) {
  if (jobs.length === 0) {
    return <p className="job-list__empty">No route searches yet</p>;
  }

  return (
    <section className="job-list">
      {jobs.map((job) => {
        const routeKey = job.result?.pathCityIds?.join("|");
        const isRouteSaved = Boolean(
          routeKey && savedRoutes.some((route) => route.route.join("|") === routeKey)
        );

        return (
          <JobCard
            key={job.jobId}
            canSaveRoutes={canSaveRoutes}
            citiesById={citiesById}
            isRouteSaved={isRouteSaved}
            isSavingRoute={isSavingRoute}
            job={job}
            onSaveRoute={onSaveRoute}
          />
        );
      })}
    </section>
  );
}
