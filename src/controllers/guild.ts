import type { Guild as DiscordGuild } from 'discord.js'
import type { GuildDB } from '../types/controllers'
import { Guild } from '@schema'
import { eq } from 'drizzle-orm'
import { Drizzle } from '~/core/utils/drizzle' // Import the drizzle instance

const db = Drizzle.db

// Controller class to handle guild-related database operations
export class GuildDBController {
  private data: GuildDB['insert']

  constructor(guild: DiscordGuild, assign: Partial<GuildDB['insert']> = {}) {
    this.data = {
      id: assign.id || guild.id,
      name: assign.name || guild.name,
      earlyBirdFilter: assign.earlyBirdFilter || false,
      enableXP: assign.enableXP || true,
      trustedURLs: assign.trustedURLs || {},
    }
  }

  static instance(guild: DiscordGuild, assign: Partial<GuildDB['insert']> = {}) {
    return new GuildDBController(guild, assign)
  }

  // Create a new guild
  async createGuild() {
    const { id, name, earlyBirdFilter, enableXP, trustedURLs } = this.data
    await db.insert(Guild).values({
      id,
      name,
      earlyBirdFilter,
      enableXP,
      trustedURLs,
    })
    return `Guild '${name}' created successfully!`
  }

  async upsertGuild() {
    const { id, name, earlyBirdFilter, enableXP, trustedURLs } = this.data
    // console.log('[DEBUG]', id, name, settings)
    await db.insert(Guild).values({
      id: String(id),
      name,
      earlyBirdFilter,
      enableXP,
      trustedURLs,
    }).onConflictDoUpdate({
      target: Guild.id,
      set: { name, earlyBirdFilter, enableXP, trustedURLs },
    })
    return `Guild '${name}' created successfully!`
  }

  async dropGuild() {
    await db.delete(Guild).where(eq(Guild.id, this.data.id))
    return `Guild '${this.data.name}' dropped successfully!`
  }
}
