import { useCallback, useEffect, useState } from "react";
import {
  createRouteSearchJob,
  deleteSavedRoute,
  listCities,
  listRouteSearchJobs,
  listSavedRoutes,
  saveRoute,
} from "../services/api";
import type { City } from "../types/city";
import type { Job } from "../types/job";
import type { SavedRoute } from "../types/savedRoute";

type CreateJobInput = {
  fromCityId: string;
  toCityId: string;
};

export function useJobState(refreshKey = 0) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadJobs() {
      try {
        setIsLoading(true);
        setError(null);
        const [backendJobs, backendCities] = await Promise.all([
          listRouteSearchJobs(),
          listCities(),
        ]);
        const backendSavedRoutes = await listSavedRoutes().catch(() => []);

        if (isCurrent) {
          setJobs(backendJobs);
          setCities(backendCities);
          setSavedRoutes(backendSavedRoutes);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err instanceof Error ? err.message : "Failed to load routes");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isCurrent = false;
    };
  }, [refreshKey]);

  const addJob = useCallback(async ({ fromCityId, toCityId }: CreateJobInput) => {
    try {
      setIsCreating(true);
      setError(null);
      const newJob = await createRouteSearchJob({ fromCityId, toCityId });
      setJobs((currentJobs) => [newJob, ...currentJobs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start route search");
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateJob = useCallback((jobId: string, patch: Partial<Job>) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.jobId === jobId ? { ...job, ...patch } : job
      )
    );
  }, []);

  const saveCalculatedRoute = useCallback(async (job: Job) => {
    const route = job.result?.pathCityIds;
    const totalDistance = job.result?.totalTravelTime;

    if (!route || route.length < 2 || typeof totalDistance !== "number") {
      setError("Route is not ready to save yet");
      return;
    }

    const alreadySaved = savedRoutes.some((savedRoute) =>
      savedRoute.route.join("|") === route.join("|")
    );

    if (alreadySaved) {
      setError("This route is already saved");
      return;
    }

    try {
      setIsSavingRoute(true);
      setError(null);
      const savedRoute = await saveRoute({ route, totalDistance });
      setSavedRoutes((currentRoutes) => [savedRoute, ...currentRoutes]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setIsSavingRoute(false);
    }
  }, [savedRoutes]);

  const removeSavedRoute = useCallback(async (savedRouteId: string) => {
    try {
      setError(null);
      await deleteSavedRoute(savedRouteId);
      setSavedRoutes((currentRoutes) =>
        currentRoutes.filter((route) => route._id !== savedRouteId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove saved route");
    }
  }, []);

  return {
    jobs,
    cities,
    savedRoutes,
    addJob,
    updateJob,
    saveCalculatedRoute,
    removeSavedRoute,
    isLoading,
    isCreating,
    isSavingRoute,
    error,
  };
}
