import type { User } from '@schema'

export interface user {
  insert: typeof User.$inferInsert
  update: Partial<Omit<user['insert'], 'guildId' | 'id'>> & { guildId: number, id: number }
  select: typeof User.$inferSelect
}
