import { v4 as uuidv4 } from "uuid";
import { getSession } from "../neo4jClient";
import { CityDTO } from "../types";

export async function createCity(data: CityDTO): Promise<CityDTO> {
  const session = getSession();
  const id = data.id ?? uuidv4();

  try {
    const result = await session.run(
      `
      CREATE (c:City {
        id: $id,
        name: $name,
        lat: $lat,
        lng: $lng
      })
      RETURN c
      `,
      {
        id,
        name: data.name,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      }
    );

    const record = result.records[0];
    const node = record.get("c");

    return {
      id: node.properties.id,
      name: node.properties.name,
      lat: node.properties.lat ?? undefined,
      lng: node.properties.lng ?? undefined,
    };
  } finally {
    await session.close();
  }
}

export async function getCityById(id: string): Promise<CityDTO | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:City {id: $id})
      RETURN c
      `,
      { id }
    );

    if (result.records.length === 0) {
      return null;
    }

    const node = result.records[0].get("c");

    return {
      id: node.properties.id,
      name: node.properties.name,
      lat: node.properties.lat ?? undefined,
      lng: node.properties.lng ?? undefined,
    };
  } finally {
    await session.close();
  }
}

export async function listCities(): Promise<CityDTO[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:City)
      RETURN c
      ORDER BY c.name
      `
    );

    return result.records.map((record) => {
      const node = record.get("c");
      return {
        id: node.properties.id,
        name: node.properties.name,
        country: node.properties.country ?? undefined,
        lat: node.properties.lat ?? undefined,
        lng: node.properties.lng ?? undefined,
      } as CityDTO;
    });
  } finally {
    await session.close();
  }
}

export async function updateCity(
  id: string,
  data: Partial<CityDTO>
): Promise<CityDTO | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:City {id: $id})
      SET
        c.name = COALESCE($name, c.name),
        c.lat = COALESCE($lat, c.lat),
        c.lng = COALESCE($lng, c.lng)
      RETURN c
      `,
      {
        id,
        name: data.name ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      }
    );

    if (result.records.length === 0) {
      return null;
    }

    const node = result.records[0].get("c");

    return {
      id: node.properties.id,
      name: node.properties.name,
      lat: node.properties.lat ?? undefined,
      lng: node.properties.lng ?? undefined,
    };
  } finally {
    await session.close();
  }
}

export async function deleteCity(id: string): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:City {id: $id})
      DETACH DELETE c
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

