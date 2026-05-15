const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const { MongoClient } = require("mongodb");

dotenv.config();

const cities = [
  { id: "kyiv", name: "Kyiv", lat: 50.4501, lng: 30.5234 },
  { id: "zhytomyr", name: "Zhytomyr", lat: 50.2547, lng: 28.6587 },
  { id: "rivne", name: "Rivne", lat: 50.6199, lng: 26.2516 },
  { id: "lviv", name: "Lviv", lat: 49.8397, lng: 24.0297 },
  { id: "ternopil", name: "Ternopil", lat: 49.5535, lng: 25.5948 },
  { id: "khmelnytskyi", name: "Khmelnytskyi", lat: 49.4216, lng: 26.9965 },
  { id: "vinnytsia", name: "Vinnytsia", lat: 49.2331, lng: 28.4682 },
  { id: "uman", name: "Uman", lat: 48.7484, lng: 30.2218 },
  { id: "odesa", name: "Odesa", lat: 46.4825, lng: 30.7233 },
  { id: "mykolaiv", name: "Mykolaiv", lat: 46.975, lng: 31.9946 },
  { id: "cherkasy", name: "Cherkasy", lat: 49.4444, lng: 32.0598 },
  { id: "kropyvnytskyi", name: "Kropyvnytskyi", lat: 48.5079, lng: 32.2623 },
  { id: "dnipro", name: "Dnipro", lat: 48.4647, lng: 35.0462 },
  { id: "zaporizhzhia", name: "Zaporizhzhia", lat: 47.8388, lng: 35.1396 },
  { id: "poltava", name: "Poltava", lat: 49.5883, lng: 34.5514 },
  { id: "kharkiv", name: "Kharkiv", lat: 49.9935, lng: 36.2304 },
];

const undirectedRoads = [
  ["kyiv", "zhytomyr", 110],
  ["zhytomyr", "rivne", 180],
  ["rivne", "lviv", 210],
  ["lviv", "ternopil", 130],
  ["ternopil", "khmelnytskyi", 110],
  ["khmelnytskyi", "vinnytsia", 120],
  ["vinnytsia", "uman", 150],
  ["uman", "odesa", 280],
  ["odesa", "mykolaiv", 150],
  ["mykolaiv", "kropyvnytskyi", 210],
  ["kropyvnytskyi", "dnipro", 250],
  ["dnipro", "zaporizhzhia", 85],
  ["kyiv", "cherkasy", 190],
  ["cherkasy", "kropyvnytskyi", 130],
  ["kyiv", "poltava", 340],
  ["poltava", "kharkiv", 150],
  ["poltava", "dnipro", 190],
  ["kyiv", "vinnytsia", 260],
  ["uman", "cherkasy", 170],
  ["dnipro", "kharkiv", 220],
];

const roads = undirectedRoads.flatMap(([fromCityId, toCityId, travelTime]) => [
  { fromCityId, toCityId, travelTime, type: "highway" },
  { fromCityId: toCityId, toCityId: fromCityId, travelTime, type: "highway" },
]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

async function resetNeo4j() {
  const driver = neo4j.driver(
    requiredEnv("NEO4J_URI"),
    neo4j.auth.basic(requiredEnv("NEO4J_USERNAME"), requiredEnv("NEO4J_PASSWORD"))
  );
  const session = driver.session();

  try {
    await session.run("CREATE CONSTRAINT city_id_unique IF NOT EXISTS FOR (c:City) REQUIRE c.id IS UNIQUE");
    await session.run("MATCH (c:City) DETACH DELETE c");
    await session.run(
      `
      UNWIND $cities AS city
      CREATE (:City {
        id: city.id,
        name: city.name,
        lat: city.lat,
        lng: city.lng
      })
      `,
      { cities }
    );
    await session.run(
      `
      UNWIND $roads AS road
      MATCH (from:City {id: road.fromCityId})
      MATCH (to:City {id: road.toCityId})
      CREATE (from)-[:ROAD {
        travelTime: road.travelTime,
        type: road.type
      }]->(to)
      `,
      { roads }
    );

    const summary = await session.run(
      `
      MATCH (c:City)
      WITH count(c) AS cityCount
      MATCH ()-[r:ROAD]->()
      RETURN cityCount, count(r) AS roadCount
      `
    );
    const record = summary.records[0];
    const cityCount = record.get("cityCount").toNumber();
    const roadCount = record.get("roadCount").toNumber();

    const unreachable = [];
    for (const from of cities) {
      for (const to of cities) {
        if (from.id === to.id) continue;
        const result = await session.run(
          `
          MATCH (from:City {id: $fromId})
          MATCH (to:City {id: $toId})
          OPTIONAL MATCH path = shortestPath((from)-[:ROAD*..20]->(to))
          RETURN path IS NOT NULL AS reachable
          `,
          { fromId: from.id, toId: to.id }
        );
        if (!result.records[0].get("reachable")) {
          unreachable.push(`${from.id}->${to.id}`);
        }
      }
    }

    if (unreachable.length > 0) {
      throw new Error(`Route graph has unreachable city pairs: ${unreachable.join(", ")}`);
    }

    console.log(`Neo4j reset complete: ${cityCount} cities, ${roadCount} directed roads.`);
    console.log("Connectivity check complete: every city can reach every other city.");
  } finally {
    await session.close();
    await driver.close();
  }
}

async function clearRouteSearchHistory() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.log("MONGO_URI is not set. Skipping route-search history cleanup.");
    return;
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection("routesearchjobs").deleteMany({});
    console.log(`Mongo cleanup complete: removed ${result.deletedCount} route-search records.`);
  } finally {
    await client.close();
  }
}

async function main() {
  await resetNeo4j();
  await clearRouteSearchHistory();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
