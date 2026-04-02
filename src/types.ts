export interface CityDTO {
  id?: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface RoadDTO {
  id?: string;
  fromCityId: string;
  toCityId: string;
  travelTime?: number;
  type?: string;
}

