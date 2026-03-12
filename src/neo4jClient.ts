import neo4j, { Driver, Session } from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.NEO4J_URI as string;
const username = process.env.NEO4J_USERNAME as string;
const password = process.env.NEO4J_PASSWORD as string;

if (!uri || !username || !password) {
  console.warn(
    "Neo4j configuration is missing. Please set NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD in your .env file."
  );
}

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}

export function getSession(database?: string): Session {
  const drv = getNeo4jDriver();
  return drv.session({ database });
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

