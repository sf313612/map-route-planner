import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { JobForm } from "../components/JobForm";
import { JobList } from "../components/JobList";
import { SavedRoutesModal } from "../components/SavedRoutesModal";
import { useJobSocket } from "../hooks/useJobSocket";
import { useJobState } from "../hooks/useJobState";
import { clearAuthSession, getAuthSession, login, register } from "../services/api";
import type { AuthSession } from "../types/auth";

const connectionLabelMap = {
  connecting: "Connecting live updates",
  connected: "Live updates on",
  reconnecting: "Reconnecting live updates",
  fallback: "Checking updates periodically",
  disconnected: "Live updates off",
};

export function JobPage() {
  const [isSavedRoutesOpen, setIsSavedRoutesOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const {
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
  } = useJobState(sessionRefreshKey);
  const citiesById = useMemo(
    () => new Map(cities.map((city) => [city.id, city])),
    [cities]
  );

  const { connectionStatus } = useJobSocket({
    jobs,
    refreshKey: sessionRefreshKey,
    updateJob,
  });
  const registeredDisplayName = session?.isGuest ? null : session?.username ?? session?.email ?? null;
  const canSaveRoutes = Boolean(registeredDisplayName);

  useEffect(() => {
    let isCurrent = true;

    async function loadSession() {
      const activeSession = await getAuthSession();

      if (isCurrent) {
        setSession(activeSession);
      }
    }

    void loadSession();

    return () => {
      isCurrent = false;
    };
  }, [sessionRefreshKey]);

  const handleLogin = async (input: { email: string; password: string }) => {
    try {
      setAuthError(null);
      const nextSession = await login(input);
      setSession(nextSession);
      setIsSavedRoutesOpen(false);
      setSessionRefreshKey((currentKey) => currentKey + 1);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to log in");
    }
  };

  const handleRegister = async (input: {
    username: string;
    email: string;
    password: string;
  }) => {
    try {
      setAuthError(null);
      const nextSession = await register(input);
      setSession(nextSession);
      setIsSavedRoutesOpen(false);
      setSessionRefreshKey((currentKey) => currentKey + 1);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to create account");
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setSession(null);
    setAuthError(null);
    setIsSavedRoutesOpen(false);
    setSessionRefreshKey((currentKey) => currentKey + 1);
  };

  return (
    <main className="jobs-page">
      <section className="jobs-page__hero">
        <div>
          <p className="jobs-page__eyebrow">Live route planner</p>
          <h1 className="jobs-page__title">Find the best route</h1>
          <p className="jobs-page__subtitle">
            Choose two cities and follow the route search as it progresses.
          </p>
        </div>
        <div className="jobs-page__header-actions">
          {registeredDisplayName ? (
            <span className="jobs-page__user-name">{registeredDisplayName}</span>
          ) : null}
          {canSaveRoutes ? (
            <button
              className="jobs-page__saved-button"
              type="button"
              onClick={() => setIsSavedRoutesOpen(true)}
            >
              Saved routes ({savedRoutes.length})
            </button>
          ) : null}
        </div>
      </section>

      <AuthPanel
        canLogout={canSaveRoutes}
        error={authError}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRegister={handleRegister}
      />

      <section className="jobs-page__panel">
        <h2>Search route</h2>
        <JobForm cities={cities} isCreating={isCreating} onCreateJob={addJob} />
        {error ? <p className="jobs-page__error">{error}</p> : null}
      </section>

      <section className="jobs-page__panel">
        <div className="jobs-page__list-header">
          <h2>Recent searches</h2>
          <span>{jobs.length} total</span>
        </div>
        <p className={`jobs-page__connection jobs-page__connection--${connectionStatus}`}>
          {connectionLabelMap[connectionStatus]}
        </p>

        {isLoading ? (
          <p className="job-list__empty">Loading routes...</p>
        ) : (
          <JobList
            canSaveRoutes={canSaveRoutes}
            citiesById={citiesById}
            isSavingRoute={isSavingRoute}
            jobs={jobs}
            onSaveRoute={saveCalculatedRoute}
            savedRoutes={savedRoutes}
          />
        )}
      </section>

      <SavedRoutesModal
        citiesById={citiesById}
        isOpen={isSavedRoutesOpen}
        routes={savedRoutes}
        onClose={() => setIsSavedRoutesOpen(false)}
        onRemoveRoute={removeSavedRoute}
      />
    </main>
  );
}
