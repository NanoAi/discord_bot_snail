import type { User } from '~/database/drizzle.schema'

export interface UserDB {
  Insert: typeof User.$inferInsert
  Update: Partial<UserDB['Insert']> & { guildId: number, id: number }
  Select: typeof User.$inferSelect
}

export type UserDBInsert = typeof User.$inferInsert
export type UserDBUpdate = Partial<UserDBInsert> & { guildId: number, id: number }
export type UserDBSelect = typeof User.$inferSelect
