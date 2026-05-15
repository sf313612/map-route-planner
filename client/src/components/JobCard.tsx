import type { Job } from "../types/job";
import type { City } from "../types/city";
import { RouteMap } from "./RouteMap";
import { StatusBadge } from "./StatusBadge";

type JobCardProps = {
  job: Job;
  citiesById: Map<string, City>;
  isRouteSaved: boolean;
  isSavingRoute: boolean;
  canSaveRoutes: boolean;
  onSaveRoute: (job: Job) => Promise<void>;
};

function getCityLabel(citiesById: Map<string, City>, cityId: string): string {
  return citiesById.get(cityId)?.name ?? cityId;
}

export function JobCard({
  job,
  citiesById,
  isRouteSaved,
  isSavingRoute,
  canSaveRoutes,
  onSaveRoute,
}: JobCardProps) {
  const pathLabels = job.result?.pathCityIds?.map((cityId) =>
    getCityLabel(citiesById, cityId)
  );
  const fromCity = getCityLabel(citiesById, job.fromCityId);
  const toCity = getCityLabel(citiesById, job.toCityId);
  const canSaveRoute = Boolean(job.result?.pathCityIds?.length && job.status === "DONE");

  return (
    <article className="job-card">
      <div className="job-card__header">
        <h3 className="job-card__title">
          {fromCity} to {toCity}
        </h3>
        <StatusBadge status={job.status} />
      </div>

      <div className="job-card__progress">
        <div className="job-card__progress-label">
          <span>Progress</span>
          <span>{job.progress}%</span>
        </div>
        <div
          aria-label={`Route search progress ${job.progress}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={job.progress}
          className="job-card__progress-track"
          role="progressbar"
        >
          <span
            className="job-card__progress-fill"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
      <RouteMap citiesById={citiesById} job={job} />
      {job.errorMessage ? <p className="job-card__error">{job.errorMessage}</p> : null}
      {pathLabels && pathLabels.length > 0 ? (
        <div className="job-card__result">
          <p>
            Route: {pathLabels.join(" -> ")}
            {typeof job.result?.totalTravelTime === "number"
              ? ` (${job.result.totalTravelTime} min)`
              : ""}
          </p>
          {canSaveRoutes ? (
            <button
              className="job-card__save-button"
              disabled={!canSaveRoute || isSavingRoute || isRouteSaved}
              type="button"
              onClick={() => void onSaveRoute(job)}
            >
              {isRouteSaved ? "Saved" : isSavingRoute ? "Saving..." : "Save route"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
