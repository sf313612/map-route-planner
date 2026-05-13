import { JobForm } from "../components/JobForm";
import { JobList } from "../components/JobList";
import { useJobState } from "../hooks/useJobState";

export function JobPage() {
  const { jobs, addJob } = useJobState();

  return (
    <main className="jobs-page">
      <section className="jobs-page__hero">
        <p className="jobs-page__eyebrow">Frontend Lab 7</p>
        <h1 className="jobs-page__title">Route Search Jobs</h1>
        <p className="jobs-page__subtitle">
          Frontend shows state, but backend remains the source of truth.
        </p>
      </section>

      <section className="jobs-page__panel">
        <h2>Create job</h2>
        <JobForm onCreateJob={addJob} />
      </section>

      <section className="jobs-page__panel">
        <div className="jobs-page__list-header">
          <h2>Jobs</h2>
          <span>{jobs.length} total</span>
        </div>

        <JobList jobs={jobs} />
      </section>
    </main>
  );
}
