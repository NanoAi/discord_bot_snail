import { Drizzle } from '@utils/drizzle'
import { eq } from 'drizzle-orm'
import { Forum } from '@schema'
import type { QueryResult } from 'pg'

interface ForumData {
  forumId: string
  guildId: string
  managed: boolean
  bump: boolean
}

const db = Drizzle.db

export class ForumController {
  // Create a new forum
  async upsertForum(data: ForumData): Promise<QueryResult<never>> {
    return await db.insert(Forum).values({
      id: data.forumId,
      guildId: data.guildId,
      managed: data.managed,
      bump: data.bump,
    }).onConflictDoUpdate({
      target: Forum.id,
      set: {
        guildId: data.guildId,
        managed: data.managed,
        bump: data.bump,
      },
    })
  }

  // Get a forum by ID
  async getForumById(forumId: string):
  Promise<{ id: string, guildId: string, managed: boolean, bump: boolean }[]> { // Adjust return type if needed
    return await db.select().from(Forum).where(eq(Forum.id, forumId))
  }

  // Get all forums for a specific guild
  async getForumsByGuild(guildId: string): Promise<any[]> { // Adjust return type if needed
    return await db.select().from(Forum).where(eq(Forum.guildId, guildId))
  }

  // Update a forum by ID
  async updateForum(forumId: string, data: Partial<ForumData>): Promise<QueryResult<never>> {
    return await db.update(Forum).set(data).where(eq(Forum.id, forumId))
  }

  // Delete a forum by ID
  async deleteForum(forumId: string): Promise<QueryResult<never>> {
    return await db.delete(Forum).where(eq(Forum.id, forumId))
  }
}
