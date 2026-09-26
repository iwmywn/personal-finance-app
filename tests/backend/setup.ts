import "@/tests/shared/mocks/translations.mock"
import "@/tests/backend/mocks/env.mock"
import "@/tests/backend/mocks/cache.mock"
import "@/tests/backend/mocks/server.mock"
import "@/tests/backend/mocks/server-only.mock"
import "@/tests/backend/mocks/headers.mock"

import { MongoMemoryReplSet } from "mongodb-memory-server"

import { connect, disconnect } from "@/lib/db"

let mongoServer: MongoMemoryReplSet

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create()
  const mongoUri = mongoServer.getUri()

  process.env.DB_URI = mongoUri

  await connect()
})

afterAll(async () => {
  await disconnect()
  if (mongoServer) {
    await mongoServer.stop()
  }

  delete process.env.MONGODB_URI
})

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(async () => {
  const db = await connect()
  const collections = await db.listCollections().toArray()

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({})
  }
})
