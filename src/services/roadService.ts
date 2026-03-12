import { v4 as uuidv4 } from "uuid";
import { getSession } from "../neo4jClient";
import { RoadDTO, CityDTO } from "../types";

export interface RoadWithCities {
  road: RoadDTO;
  fromCity: CityDTO;
  toCity: CityDTO;
}

export async function createRoad(data: RoadDTO): Promise<RoadWithCities> {
  const session = getSession();
  const id = data.id ?? uuidv4();

  try {
    const result = await session.run(
      `
      MATCH (from:City {id: $fromCityId}), (to:City {id: $toCityId})
      CREATE (from)-[r:ROAD {
        id: $id,
        travelTime: $travelTime,
        type: $type
      }]->(to)
      RETURN from, r, to
      `,
      {
        id,
        fromCityId: data.fromCityId,
        toCityId: data.toCityId,
        travelTime: data.travelTime ?? null,
        type: data.type ?? null,
      }
    );

    if (result.records.length === 0) {
      throw new Error("One or both cities not found");
    }

    const record = result.records[0];
    const from = record.get("from");
    const r = record.get("r");
    const to = record.get("to");

    return {
      road: {
        id: r.properties.id,
        fromCityId: data.fromCityId,
        toCityId: data.toCityId,
        travelTime: r.properties.travelTime ?? undefined,
        type: r.properties.type ?? undefined,
      },
      fromCity: {
        id: from.properties.id,
        name: from.properties.name,
        lat: from.properties.lat ?? undefined,
        lng: from.properties.lng ?? undefined,
      },
      toCity: {
        id: to.properties.id,
        name: to.properties.name,
        lat: to.properties.lat ?? undefined,
        lng: to.properties.lng ?? undefined,
      },
    };
  } finally {
    await session.close();
  }
}

export async function listRoads(): Promise<RoadWithCities[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (from:City)-[r:ROAD]->(to:City)
      RETURN from, r, to
      `
    );

    return result.records.map((record) => {
      const from = record.get("from");
      const r = record.get("r");
      const to = record.get("to");

      return {
        road: {
          id: r.properties.id,
          fromCityId: from.properties.id,
          toCityId: to.properties.id,
          travelTime: r.properties.travelTime ?? undefined,
          type: r.properties.type ?? undefined,
        },
        fromCity: {
          id: from.properties.id,
          name: from.properties.name,
          lat: from.properties.lat ?? undefined,
          lng: from.properties.lng ?? undefined,
        },
        toCity: {
          id: to.properties.id,
          name: to.properties.name,
          lat: to.properties.lat ?? undefined,
          lng: to.properties.lng ?? undefined,
        },
      } as RoadWithCities;
    });
  } finally {
    await session.close();
  }
}

export async function updateRoad(
  id: string,
  data: Partial<RoadDTO>
): Promise<RoadWithCities | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (from:City)-[r:ROAD {id: $id}]->(to:City)
      SET
        r.travelTime = COALESCE($travelTime, r.travelTime),
        r.type = COALESCE($type, r.type)
      RETURN from, r, to
      `,
      {
        id,
        travelTime: data.travelTime ?? null,
        type: data.type ?? null,
      }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const from = record.get("from");
    const r = record.get("r");
    const to = record.get("to");

    return {
      road: {
        id: r.properties.id,
        fromCityId: from.properties.id,
        toCityId: to.properties.id,
        travelTime: r.properties.travelTime ?? undefined,
        type: r.properties.type ?? undefined,
      },
      fromCity: {
        id: from.properties.id,
        name: from.properties.name,
        lat: from.properties.lat ?? undefined,
        lng: from.properties.lng ?? undefined,
      },
      toCity: {
        id: to.properties.id,
        name: to.properties.name,
        lat: to.properties.lat ?? undefined,
        lng: to.properties.lng ?? undefined,
      },
    };
  } finally {
    await session.close();
  }
}

export async function deleteRoad(id: string): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH ()-[r:ROAD {id: $id}]->()
      DELETE r
      RETURN COUNT(*) AS deletedCount
      `,
      { id }
    );

    const deletedCount = result.records[0].get("deletedCount").toNumber();
    return deletedCount > 0;
  } finally {
    await session.close();
  }
}

