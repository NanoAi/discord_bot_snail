import { env } from 'node:process'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { logger } from './logger'

if (!env.DATABASE_URL)
  throw new Error('Database Settings Not Defined.')

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: false,
})

export class Drizzle {
  public static db = drizzle(pool)

  static async version() {
    try {
      const result = await this.db.execute(sql`SELECT version();`)
      const output = result.rows[0] && result.rows[0].version
      if (!output) {
        console.log(result)
        throw new Error('Unexpected Database Version Return.')
      }
      logger.info(`Database Version: ${output}`)
    }
    catch (err) {
      logger.error(err, 'Failed to connect to Database.')
    }
  }
}
