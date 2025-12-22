import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: Requires an adapter for PostgreSQL
// Create a connection pool and adapter
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Extract schema from connection string or default to 'oddsoracle'
const url = new URL(connectionString)
const schema = url.searchParams.get('schema') || 'oddsoracle'

// Create pool and set search_path on each connection
const pool = new Pool({ 
  connectionString,
})

// Set search_path when a connection is created
pool.on('connect', async (client) => {
  await client.query(`SET search_path TO ${schema}, public`)
})

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
