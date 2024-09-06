import { Drizzle } from '@utils/drizzle' // Import the Drizzle instance
import { eq } from 'drizzle-orm'
import type { GuildMember } from 'discord.js'
import type { UserDBInsert, UserDBUpdate } from './types/userController'
import { User } from '~/database/drizzle.schema' // Import the User model

const db = Drizzle.db

export class UserDBController {
  private data: UserDBInsert

  constructor(member: GuildMember, assign?: Partial<UserDBInsert>) {
    const replace = assign || {}
    // Default Settings.
    this.data = {
      guildId: member.guild.id,
      id: member.id,
      lastMessage: new Date(0),
      roles: [],
      username: member.user.username,
      warnings: 0,
      xp: 0,
    }
    Object.assign(this.data, replace)
  }

  // Get a user by ID
  async getUserById(id: string) {
    const result = await db.select().from(User).where(eq(User.id, id)).execute()
    return result[0] || null
  }

  // Get all users in a specific guild
  async getUsersByGuildId(guildId: string) {
    const result = await db.select().from(User).where(eq(User.guildId, guildId)).execute()
    return result
  }

  // Create a new user
  async createUser() {
    const result = await db.insert(User).values(this.data)
    return result
  }

  async upsertUser() {
    const { guildId, id, ...data } = this.data
    const result = await db.insert(User).values(this.data).onConflictDoUpdate({
      target: User.id,
      set: { ...data },
    })
    return result
  }

  // Update a user's XP and roles
  async updateUser(data: UserDBUpdate) {
    await db.update(User).set({ xp: data.xp, roles: data.roles }).where(eq(User.id, data.guildId)).execute()
    return this.getUserById(data.guildId)
  }

  // Delete a user by ID
  async deleteUser(id: string) {
    await db.delete(User).where(eq(User.id, id)).execute()
  }
}
