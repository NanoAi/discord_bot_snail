import { Drizzle } from '@utils/drizzle' // Import the Drizzle instance
import { User } from '@schema' // Import the User model
import { eq } from 'drizzle-orm'
import type { user } from './types/userController'

const db = Drizzle.db

class UserController {
  // Get a user by ID
  async getUserById(id: number) {
    const result = await db.select().from(User).where(eq(User.id, id)).execute()
    return result[0] || null
  }

  // Get all users in a specific guild
  async getUsersByGuildId(guildId: number) {
    const result = await db.select().from(User).where(eq(User.guildId, guildId)).execute()
    return result
  }

  // Create a new user
  async createUser(data: user['insert']) {
    const result = await db.insert(User).values(data)
    return result
  }

  // Update a user's XP and roles
  async updateUser(data: user['update']) {
    await db.update(User).set({ xp: data.xp, roles: data.roles }).where(eq(User.id, data.guildId)).execute()
    return this.getUserById(data.guildId)
  }

  // Delete a user by ID
  async deleteUser(id: number) {
    await db.delete(User).where(eq(User.id, id)).execute()
  }
}

export const userController = new UserController()
