import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { ENV } from '~/index'
import { logger } from './logger'

if (!ENV.DATABASE_URL)
  throw new Error('Database Settings Not Defined.')

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
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
      console.log(`- Database Version: ${output}`)
    }
    catch (err) {
      logger.error(err, 'Failed to connect to Database.')
    }
  }
}
