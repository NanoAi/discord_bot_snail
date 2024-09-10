import { Drizzle } from '@utils/drizzle' // Import the Drizzle instance
import { and, eq } from 'drizzle-orm'
import type { GuildMember } from 'discord.js'
import { Case, User } from '@schema'
import type { UserDB } from '../types/controllers'
import { nullDate } from '~/modules/utils/dayjs'

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
      warnings: assign.warnings || 0,
      xp: assign.xp || 0,
    }
  }

  static instance(member: GuildMember, assign: Partial<UserDB['insert']> = {}) {
    return new UserDBController(member, assign)
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
    const set = update && { ...update } || data && { ...data }
    const result = await db.insert(User).values(this.data).onConflictDoUpdate({
      target: User.id,
      set,
    })
    return result
  }

  // Update a user's XP and roles
  async updateUser(update: UserDB['update']) {
    return await db.update(User).set({ ...update })
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
