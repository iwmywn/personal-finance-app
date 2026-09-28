import "server-only"

import { MongoClient } from "mongodb"
import type {
  ClientSession,
  Collection,
  Db,
  MongoClientOptions,
  OptionalId,
} from "mongodb"

import { serverEnv } from "@/env/server"
import { initIndexes, resetIndexes } from "@/lib/indexes"

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
  var _mongoClient: MongoClient | undefined
}

let db: Db | undefined

export function getClientPromise(): Promise<MongoClient> {
  if (!globalThis._mongoClientPromise) {
    const options: MongoClientOptions = {}
    globalThis._mongoClientPromise = new MongoClient(
      serverEnv.DB_URI,
      options
    ).connect()
  }
  return globalThis._mongoClientPromise
}

export async function connect(): Promise<Db> {
  if (db) {
    return db
  }

  const client = await getClientPromise()
  db = client.db(serverEnv.DB_NAME)
  globalThis._mongoClient = client

  await initIndexes(db)

  return db
}

export async function disconnect(): Promise<void> {
  if (globalThis._mongoClient) {
    try {
      await globalThis._mongoClient.close()
    } catch {
      // Ignore connection close interruptions during teardown
    }
    globalThis._mongoClient = undefined
  } else if (globalThis._mongoClientPromise) {
    try {
      const client = await globalThis._mongoClientPromise
      await client.close()
    } catch {
      // Ignore connection close interruptions during teardown
    }
  }
  globalThis._mongoClientPromise = undefined
  db = undefined
  resetIndexes()
}

export async function collection<T>(
  collectionName: string
): Promise<Collection<OptionalId<T>>> {
  const db = await connect()
  return db.collection<OptionalId<T>>(collectionName)
}

export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>
): Promise<T> {
  const client = await getClientPromise()
  const session = client.startSession()

  try {
    return await session.withTransaction(() => callback(session))
  } finally {
    await session.endSession()
  }
}
