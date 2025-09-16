import * as process from 'node:process'
import { SystemCache } from './core/cache'
import 'dotenv/config'

// Reset Console.
console.clear()
console.log('~\nStarting...')

export abstract class ENV {
  static readonly DISCORD_TOKEN = process.env.DISCORD_TOKEN!
  static readonly PUBLIC_KEY = process.env.PUBLIC_KEY!
  static readonly APP_ID = process.env.APP_ID!
  static readonly TEST_SERVER = process.env.TEST_SERVER!
  static readonly DATABASE_URL = process.env.DATABASE_URL!
  static readonly START_TIME = new Date()
}

Object.freeze(ENV)
for (const [k, v] of Object.entries(ENV)) {
  if (!v)
    throw new Error(`Expected Environment Variable "${k}" got "${v}".`)
}

SystemCache.init({
  guildTTL: 300,
  guildCheckPeriod: 30,
})

import('./client')
