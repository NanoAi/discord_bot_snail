import type { QueryResult } from 'pg'
import type { ForumDB } from '~/types/controllers'
import { Forum } from '@schema'
import { and, eq } from 'drizzle-orm'
import { Drizzle } from '~/core/utils/drizzle'

interface ForumData {
  forumId: string
  guildId: string
  managed: boolean
  bump: number
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
  async getGuildForumById(guildId: string, forumId: string): Promise<ForumDB['select'][]> {
    return await db.select().from(Forum).where(and(eq(Forum.guildId, guildId), eq(Forum.id, forumId)))
  }

  // Get all forums for a specific guild
  async getForumsByGuild(guildId: string): Promise<ForumDB['select'][]> {
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
