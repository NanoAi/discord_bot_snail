import type { Action, Case, Forum, Guild, Ticket, User } from '@schema'

export interface ActionDB {
  insert: typeof Action.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'caseId'>>
  select: typeof Action.$inferSelect
}

export interface CaseDB {
  insert: typeof Case.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'guildId'>>
  select: typeof Case.$inferSelect
}

export interface ForumDB {
  insert: typeof Forum.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'guildId'>>
  select: typeof Forum.$inferSelect
}

export interface GuildDB {
  insert: typeof Guild.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'guildId'>>
  select: typeof Guild.$inferSelect
}

export interface TicketDB {
  insert: typeof Ticket.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'caseId'>>
  select: typeof Ticket.$inferSelect
}

export interface UserDB {
  insert: typeof User.$inferInsert
  update: Partial<Omit<this['insert'], 'id' | 'guildId'>>
  select: typeof User.$inferSelect
}

/*
export type UserDBInsert = typeof User.$inferInsert
export type UserDBUpdate = Partial<UserDBInsert>
export type UserDBSelect = typeof User.$inferSelect
*/
