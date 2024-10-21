import type { GuildMember } from 'discord.js'
import type { UserDB } from '../types/controllers'
import { Case, User } from '@schema'
import { and, eq } from 'drizzle-orm'
import { nullDate } from '~/core/utils/dayjs' // Import the Drizzle instance
import { Drizzle } from '~/core/utils/drizzle'
import { logger } from '~/core/utils/logger'

const db = Drizzle.db

export class UserDBController {
  private data: UserDB['insert']

  constructor(member: GuildMember, assign: Partial<UserDB['insert']> = {}) {
    // Default Settings.
    this.data = {
      guildId: assign.guildId || member.guild.id,
      id: assign.id || member.id,
      lastMessageDate: assign.lastMessageDate || nullDate(),
      roles: assign.roles || member.roles.cache || {},
      username: assign.username || member.user.username,
      nickname: assign.nickname || member.nickname || '',
      heat: assign.heat || 0,
      xp: assign.xp || 0,
      level: assign.level || 0,
    }
  }

  static instance(member: GuildMember, assign: Partial<UserDB['insert']> = {}) {
    return new UserDBController(member, assign)
  }

  // Get a user by ID, if user doesn't exist create it.
  async getOrCreateUser() {
    const dbUser = await this.getUser()
    if (!dbUser) {
      logger.warn(`Member (${this.data.id}) doesn\'t exist in guild (${this.data.guildId}), creating.`)
      try {
        await this.upsertUser()
      }
      catch {
        logger.error(`Error: Could not create entry for member (${this.data.id}) in guild (${this.data.guildId}).`)
        return
      }
      return await this.getUser()
    }
    return dbUser
  }

  static async getUserById(id: string) {
    const result = await db.select().from(User).where(eq(User.id, id))
    return result ? result[0] : undefined
  }

  // Get a user by ID
  async getUser() {
    const result = await db.select().from(User).where(eq(User.id, this.data.id)).execute()
    return result[0] || null
  }

  // Get all users in a specific guild
  async getUsersByGuild(guildId: string) {
    const users = await db.select().from(User).where(eq(User.guildId, guildId))
    return users
  }

  // Create a new user
  async createUser() {
    const result = await db.insert(User).values(this.data)
    return result
  }

  async upsertUser(update?: UserDB['update']) {
    const { guildId, id, ...data } = this.data
    const set = (update && { ...update }) || (data && { ...data })
    const result = await db.insert(User).values(this.data).onConflictDoUpdate({
      target: User.id,
      set,
    })
    return result
  }

  // Update a user's XP and roles
  async updateUser(update: UserDB['update']) {
    return await db
      .update(User)
      .set({ ...update })
      .where(and(eq(User.guildId, this.data.guildId), eq(User.id, this.data.id)))
  }

  // Delete a user by ID
  async deleteUser(id: string) {
    await db.delete(User).where(eq(User.id, id))
  }

  async getCasesByUser(guildId: string, userId: string) {
    const cases = await db.select().from(Case).where(and(eq(Case.guildId, guildId), eq(Case.userId, userId)))
    return cases
  }
}
