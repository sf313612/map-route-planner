import { useState } from "react";
import type { SyntheticEvent } from "react";

type JobFormProps = {
  onCreateJob: (input: { fromCityId: string; toCityId: string }) => void;
};

export function JobForm({ onCreateJob }: JobFormProps) {
  const [fromCityId, setFromCityId] = useState("");
  const [toCityId, setToCityId] = useState("");

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedFromCityId = fromCityId.trim();
    const trimmedToCityId = toCityId.trim();

    if (!trimmedFromCityId || !trimmedToCityId) {
      return;
    }

    onCreateJob({
      fromCityId: trimmedFromCityId,
      toCityId: trimmedToCityId,
    });

    setFromCityId("");
    setToCityId("");
  };

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <div className="job-form__fields">
        <label className="job-form__field">
          <span>From city</span>
          <input
            type="text"
            value={fromCityId}
            onChange={(event) => setFromCityId(event.target.value)}
            placeholder="kyiv"
          />
        </label>

        <label className="job-form__field">
          <span>To city</span>
          <input
            type="text"
            value={toCityId}
            onChange={(event) => setToCityId(event.target.value)}
            placeholder="lviv"
          />
        </label>
      </div>

      <button className="job-form__button" type="submit">
        Create job
      </button>
    </form>
  );
}
