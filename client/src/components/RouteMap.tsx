import type { City } from "../types/city";
import type { Job } from "../types/job";

type RouteMapProps = {
  citiesById: Map<string, City>;
  job: Job;
};

type MapPoint = {
  city: City;
  x: number;
  y: number;
};

const MAP_WIDTH = 720;
const MAP_HEIGHT = 260;
const MAP_PADDING = 34;

function getRouteCityIds(job: Job): string[] {
  const resultPath = job.result?.pathCityIds;

  if (resultPath && resultPath.length > 0) {
    return resultPath;
  }

  return [job.fromCityId, job.toCityId];
}

function getBounds(cities: City[]) {
  const lats = cities.map((city) => city.lat).filter((lat): lat is number => typeof lat === "number");
  const lngs = cities.map((city) => city.lng).filter((lng): lng is number => typeof lng === "number");

  if (lats.length === 0 || lngs.length === 0) {
    return null;
  }

  return {
    maxLat: Math.max(...lats),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    minLng: Math.min(...lngs),
  };
}

function toPoint(city: City, bounds: NonNullable<ReturnType<typeof getBounds>>): MapPoint {
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 1);
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 1);
  const x = MAP_PADDING + ((city.lng! - bounds.minLng) / lngRange) * (MAP_WIDTH - MAP_PADDING * 2);
  const y = MAP_PADDING + ((bounds.maxLat - city.lat!) / latRange) * (MAP_HEIGHT - MAP_PADDING * 2);

  return { city, x, y };
}

export function RouteMap({ citiesById, job }: RouteMapProps) {
  const routeCities = getRouteCityIds(job)
    .map((cityId) => citiesById.get(cityId))
    .filter((city): city is City => Boolean(city?.lat && city?.lng));

  if (routeCities.length < 2) {
    return null;
  }

  const bounds = getBounds(Array.from(citiesById.values()));

  if (!bounds) {
    return null;
  }

  const points = routeCities.map((city) => toPoint(city, bounds));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const isPreview = !job.result?.pathCityIds || job.result.pathCityIds.length === 0;

  return (
    <figure className="route-map" aria-label="Route map preview">
      <svg
        className="route-map__svg"
        role="img"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      >
        <defs>
          <pattern id="route-map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#dbe4f0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect className="route-map__water" height="260" rx="12" width="720" />
        <path
          className="route-map__land route-map__land--north"
          d="M0 46 C110 12 210 24 318 52 C436 82 528 48 720 22 L720 0 L0 0 Z"
        />
        <path
          className="route-map__land route-map__land--south"
          d="M0 206 C92 178 188 194 282 216 C412 248 520 224 720 184 L720 260 L0 260 Z"
        />
        <rect fill="url(#route-map-grid)" height="260" opacity="0.55" rx="12" width="720" />
        <polyline
          className={isPreview ? "route-map__line route-map__line--preview" : "route-map__line"}
          points={linePoints}
        />
        {points.map((point, index) => {
          const isEndpoint = index === 0 || index === points.length - 1;

          return (
            <g key={`${point.city.id}-${index}`} className="route-map__marker">
              <circle
                className={isEndpoint ? "route-map__dot route-map__dot--endpoint" : "route-map__dot"}
                cx={point.x}
                cy={point.y}
                r={isEndpoint ? 7 : 5}
              />
              <text
                className="route-map__label"
                x={point.x + 10}
                y={point.y - 10}
              >
                {point.city.name}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="route-map__caption">
        {isPreview ? "Previewing direct direction while the route is calculated" : "Calculated route"}
      </figcaption>
    </figure>
  );
}
