import { Drizzle } from '@utils/drizzle' // Import the Drizzle instance
import { eq } from 'drizzle-orm'
import type { GuildMember } from 'discord.js'
import type { UserDBInsert, UserDBUpdate } from './types/userController'
import { User } from '~/database/drizzle.schema' // Import the User model

const db = Drizzle.db

export class UserDBController {
  static getTemplate(member: GuildMember, overwrite?: Partial<UserDBInsert>): UserDBInsert {
    const replace = overwrite || {}
    return {
      guildId: replace.guildId || member.guild.id,
      id: replace.id || member.id,
      lastMessage: replace.lastMessage || new Date(),
      roles: replace.roles || [],
      username: replace.username || member.user.username,
      warnings: replace.warnings || 0,
      xp: replace.xp || 0,
    }
  }

  // Get a user by ID
  static async getUserById(id: string) {
    const result = await db.select().from(User).where(eq(User.id, id)).execute()
    return result[0] || null
  }

  // Get all users in a specific guild
  static async getUsersByGuildId(guildId: string) {
    const result = await db.select().from(User).where(eq(User.guildId, guildId)).execute()
    return result
  }

  // Create a new user
  static async createUser(data: UserDBInsert) {
    const result = await db.insert(User).values(data)
    return result
  }

  static async upsertUser(data: UserDBInsert) {
    const result = await db.insert(User).values(data).onConflictDoUpdate({
      target: User.id,
      set: {
        lastMessage: data.lastMessage,
        roles: data.roles,
        username: data.username,
        warnings: data.warnings,
        xp: data.xp,
      },
    })
    return result
  }

  // Update a user's XP and roles
  static async updateUser(data: UserDBUpdate) {
    await db.update(User).set({ xp: data.xp, roles: data.roles }).where(eq(User.id, data.guildId)).execute()
    return this.getUserById(data.guildId)
  }

  // Delete a user by ID
  static async deleteUser(id: string) {
    await db.delete(User).where(eq(User.id, id)).execute()
  }
}
