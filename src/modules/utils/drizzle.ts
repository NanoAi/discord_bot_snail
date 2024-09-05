import path from 'node:path'
import { env } from 'node:process'
import { Buffer } from 'node:buffer'
import type { SQLWrapper } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle } from 'drizzle-orm/node-postgres'
import flatCache from 'flat-cache'
import { Pool } from 'pg'
import { logger } from './logger'

if (!env.DATABASE_URL)
  throw new Error('Database Settings Not Defined.')

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

interface CacheEntry {
  memory: string
  result: any
}

interface DatabaseType extends NodePgDatabase<Record<string, never>> {

}

class CacheWrapper {
  private db: DatabaseType
  private cache: flatCache.Cache

  constructor(database: DatabaseType) {
    this.db = database
    this.cache = flatCache.load('queryCache', path.resolve('./.cache'))
  }

  async execute(query: SQLWrapper, bypass: boolean): Promise<any> {
    const memory = JSON.stringify(query)

    if (bypass) {
      // Bypass cache and directly execute the query
      const result = await this.db.execute(query)
      return result.rows
    }

    // Check cache first
    const cacheHit = this.cache.getKey(memory)
    if (cacheHit) {
      logger.info(`Cache hit! @ ${memory}`)
      setTimeout(async () => {
        this.cache.removeKey(memory)
        await this.db.execute(query)
      }, 15_000)
      return cacheHit.result
    }

    // If no cache hit, execute the query
    const result = await this.db.execute(query)

    // Store the result in the cache
    const newCacheEntry: CacheEntry = { memory, result: result.rows }
    this.cache.setKey(memory, newCacheEntry)
    this.cache.save() // Persist cache to the local file system

    return result.rows
  }
}

export class Drizzle {
  public static db = drizzle(pool)
  public static cache = new CacheWrapper(this.db)

  static async version() {
    const result = await this.db.execute(sql`SELECT version();`)
    console.log(result.rows[0])
  }
}

// getPgVersion().catch(console.error)
