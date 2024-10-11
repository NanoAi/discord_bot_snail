import type { Guild as DiscordGuild } from 'discord.js'
import type { GuildDB } from '../types/controllers'
import { Guild } from '@schema'
import { eq, sql } from 'drizzle-orm'
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
      isPremium: assign.isPremium || false,
      enableXP: assign.enableXP || true,
      trustedURLs: assign.trustedURLs || {},
      pruneWhen: assign.pruneWhen || 15,
    }
  }

  static instance(guild: DiscordGuild, assign: Partial<GuildDB['insert']> = {}) {
    return new GuildDBController(guild, assign)
  }

  static async ping() {
    await db.execute(sql`select 1`)
  }

  // Create a new guild
  async createGuild() {
    const { id, name, earlyBirdFilter, isPremium, enableXP, trustedURLs, pruneWhen } = this.data
    await db.insert(Guild).values({
      id,
      name,
      earlyBirdFilter,
      isPremium,
      enableXP,
      trustedURLs,
      pruneWhen,
    })
    return `Guild '${name}' created successfully!`
  }

  async upsertGuild() {
    const { id, name, earlyBirdFilter, isPremium, enableXP, trustedURLs, pruneWhen } = this.data
    await db.insert(Guild).values({
      id: String(id),
      name,
      earlyBirdFilter,
      isPremium,
      enableXP,
      trustedURLs,
      pruneWhen,
    }).onConflictDoUpdate({
      target: Guild.id,
      set: { name, earlyBirdFilter, isPremium, enableXP, trustedURLs, pruneWhen },
    })
    return `Guild '${name}' created successfully!`
  }

  async dropGuild() {
    await db.delete(Guild).where(eq(Guild.id, this.data.id))
    return `Guild '${this.data.name}' dropped successfully!`
  }
}
