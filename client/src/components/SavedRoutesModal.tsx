import type { City } from "../types/city";
import type { SavedRoute } from "../types/savedRoute";
import { SavedRouteList } from "./SavedRouteList";

type SavedRoutesModalProps = {
  citiesById: Map<string, City>;
  isOpen: boolean;
  routes: SavedRoute[];
  onClose: () => void;
  onRemoveRoute: (savedRouteId: string) => Promise<void>;
};

export function SavedRoutesModal({
  citiesById,
  isOpen,
  routes,
  onClose,
  onRemoveRoute,
}: SavedRoutesModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="saved-routes-modal" role="presentation">
      <div className="saved-routes-modal__backdrop" onClick={onClose} />
      <section
        aria-labelledby="saved-routes-title"
        aria-modal="true"
        className="saved-routes-modal__panel"
        role="dialog"
      >
        <div className="saved-routes-modal__header">
          <div>
            <h2 id="saved-routes-title">Saved routes</h2>
            <p>{routes.length} total</p>
          </div>
          <button
            aria-label="Close saved routes"
            className="saved-routes-modal__close"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <SavedRouteList
          citiesById={citiesById}
          routes={routes}
          onRemoveRoute={onRemoveRoute}
        />
      </section>
    </div>
  );
}
