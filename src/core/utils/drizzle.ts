import * as schema from '@schema'
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

export class Utils {
  static cast<T>(value: unknown) {
    return value as T
  }

  /**
   * Unionize a table into a new user defined key.
   * @param selections The base selection.
   * @param mergeTo The key to merge to.
   * @param mergeFrom The key to merge from.
   * @param key They key to introduce to the selections.
   * @returns The unionized table data.
   */
  static unionize<T, V extends any[]>(
    selections: V,
    mergeTo: keyof typeof selections[0],
    mergeFrom: keyof typeof selections[0],
    key: string,
  ): T[] {
    const map = new Map<number, T>()
    for (const selection of selections) {
      const k = (selection[mergeTo] as any).id // Assume that 'id' exists.
      if (selection[mergeFrom] && !map.has(k)) {
        map.set(k, { ...selection[mergeTo], [key]: [selection[mergeFrom]] } as T)
      }
      else {
        const keyValue = (map.get(k) as any)[key] // selection[mergeFrom]
        map.set(k, { ...selection[mergeTo], [key]: keyValue } as T)
      }
    }
    return Array.from(map, ([_, value]) => value)
  }
}

export class Drizzle {
  public static db = drizzle(pool, { schema })

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
