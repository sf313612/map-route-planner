import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { City } from "../types/city";

type JobFormProps = {
  cities: City[];
  isCreating: boolean;
  onCreateJob: (input: { fromCityId: string; toCityId: string }) => Promise<void>;
};

export function JobForm({ cities, isCreating, onCreateJob }: JobFormProps) {
  const [fromCityId, setFromCityId] = useState("");
  const [toCityId, setToCityId] = useState("");
  const canSubmit = Boolean(fromCityId && toCityId && fromCityId !== toCityId) && !isCreating;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onCreateJob({
      fromCityId,
      toCityId,
    });

    setFromCityId("");
    setToCityId("");
  };

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <div className="job-form__fields">
        <label className="job-form__field">
          <span>From city</span>
          <select
            value={fromCityId}
            onChange={(event) => setFromCityId(event.target.value)}
          >
            <option value="">Select city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="job-form__field">
          <span>To city</span>
          <select
            value={toCityId}
            onChange={(event) => setToCityId(event.target.value)}
          >
            <option value="">Select city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cities.length === 0 ? (
        <p className="job-form__hint">No cities are available yet.</p>
      ) : null}

      <button className="job-form__button" type="submit" disabled={!canSubmit}>
        {isCreating ? "Starting search..." : "Find route"}
      </button>
    </form>
  );
}
