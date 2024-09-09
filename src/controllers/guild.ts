import { Drizzle } from '@utils/drizzle' // Import the drizzle instance
import { Action, Case, Guild, Ticket } from '@schema'
import { eq } from 'drizzle-orm'
import type { Guild as DiscordGuild } from 'discord.js'
import type { GuildDB } from '../types/controllers'

const db = Drizzle.db

// Controller class to handle guild-related database operations
export class GuildDBController {
  private data: GuildDB['insert']

  constructor(guild: DiscordGuild, assign: Partial<GuildDB['insert']> = {}) {
    this.data = {
      id: assign.id || guild.id,
      name: assign.name || guild.name,
      settings: assign.settings || {},
    }
  }

  static instance(guild: DiscordGuild, assign: Partial<GuildDB['insert']> = {}) {
    return new GuildDBController(guild, assign)
  }

  // Create a new guild
  async createGuild(id: string, name: string, settings: object) {
    await db.insert(Guild).values({
      id,
      name,
      settings,
    })
    return `Guild '${name}' created successfully!`
  }

  async upsertGuild() {
    const { id, name, settings } = this.data
    console.log(id, name, settings)
    await db.insert(Guild).values({
      id: String(id),
      name,
      settings,
    }).onConflictDoUpdate({
      target: Guild.id,
      set: { name, settings },
    })
    return `Guild '${name}' created successfully!`
  }

  async dropGuild() {
    await db.delete(Guild).where(eq(Guild.id, this.data.id))
    return `Guild '${this.data.name}' dropped successfully!`
  }
}
