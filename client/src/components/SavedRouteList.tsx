import type { City } from "../types/city";
import type { SavedRoute } from "../types/savedRoute";

type SavedRouteListProps = {
  citiesById: Map<string, City>;
  routes: SavedRoute[];
  onRemoveRoute: (savedRouteId: string) => Promise<void>;
};

function getCityLabel(citiesById: Map<string, City>, cityId: string): string {
  return citiesById.get(cityId)?.name ?? cityId;
}

export function SavedRouteList({ citiesById, routes, onRemoveRoute }: SavedRouteListProps) {
  if (routes.length === 0) {
    return <p className="saved-routes__empty">No saved routes yet</p>;
  }

  return (
    <section className="saved-routes">
      {routes.map((route) => (
        <article className="saved-route" key={route._id}>
          <div>
            <h3 className="saved-route__title">
              {route.route.map((cityId) => getCityLabel(citiesById, cityId)).join(" -> ")}
            </h3>
            <p className="saved-route__meta">{route.totalDistance} min</p>
          </div>
          <button
            className="saved-route__remove"
            type="button"
            onClick={() => void onRemoveRoute(route._id)}
          >
            Remove
          </button>
        </article>
      ))}
    </section>
  );
}
