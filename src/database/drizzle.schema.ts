import { relations } from 'drizzle-orm'
import { foreignKey, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const Guild = pgTable('Guild', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  settings: jsonb('settings').notNull(),
})

export const User = pgTable('User', {
  id: text('id').notNull().primaryKey(),
  guildId: text('guildId').notNull(),
  username: text('username').notNull(),
  xp: integer('xp').notNull(),
  roles: jsonb('roles').notNull(),
  lastMessageDate: timestamp('lastMessageDate', { precision: 3 }).notNull().default(new Date('1969-12-31T19:00:00-05:00')),
  warnings: integer('warnings').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
}, User => ({
  User_guild_fkey: foreignKey({
    name: 'User_guild_fkey',
    columns: [User.guildId],
    foreignColumns: [Guild.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
}))

export const Case = pgTable('Case', {
  id: serial('id').notNull().primaryKey(),
  guildId: text('guildId').notNull(),
  userId: text('userId').notNull(),
  description: text('description').notNull(),
}, Case => ({
  Case_guild_fkey: foreignKey({
    name: 'Case_guild_fkey',
    columns: [Case.guildId],
    foreignColumns: [Guild.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
  Case_user_fkey: foreignKey({
    name: 'Case_user_fkey',
    columns: [Case.userId],
    foreignColumns: [User.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
}))

export const Action = pgTable('Action', {
  id: serial('id').notNull().primaryKey(),
  caseId: integer('caseId').notNull(),
  actionType: text('actionType').notNull(),
  timestamp: timestamp('timestamp', { precision: 3 }).notNull().defaultNow(),
}, Action => ({
  Action_case_fkey: foreignKey({
    name: 'Action_case_fkey',
    columns: [Action.caseId],
    foreignColumns: [Case.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
}))

export const Ticket = pgTable('Ticket', {
  id: serial('id').notNull().primaryKey(),
  caseId: integer('caseId').notNull(),
  issue: text('issue').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
}, Ticket => ({
  Ticket_case_fkey: foreignKey({
    name: 'Ticket_case_fkey',
    columns: [Ticket.caseId],
    foreignColumns: [Case.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
}))

export const GuildRelations = relations(Guild, ({ many }) => ({
  users: many(User, {
    relationName: 'GuildToUser',
  }),
  cases: many(Case, {
    relationName: 'CaseToGuild',
  }),
}))

export const UserRelations = relations(User, ({ one, many }) => ({
  guild: one(Guild, {
    relationName: 'GuildToUser',
    fields: [User.guildId],
    references: [Guild.id],
  }),
  Case: many(Case, {
    relationName: 'CaseToUser',
  }),
}))

export const CaseRelations = relations(Case, ({ many, one }) => ({
  actions: many(Action, {
    relationName: 'ActionToCase',
  }),
  tickets: many(Ticket, {
    relationName: 'CaseToTicket',
  }),
  guild: one(Guild, {
    relationName: 'CaseToGuild',
    fields: [Case.guildId],
    references: [Guild.id],
  }),
  user: one(User, {
    relationName: 'CaseToUser',
    fields: [Case.userId],
    references: [User.id],
  }),
}))

export const ActionRelations = relations(Action, ({ one }) => ({
  case: one(Case, {
    relationName: 'ActionToCase',
    fields: [Action.caseId],
    references: [Case.id],
  }),
}))

export const TicketRelations = relations(Ticket, ({ one }) => ({
  case: one(Case, {
    relationName: 'CaseToTicket',
    fields: [Ticket.caseId],
    references: [Case.id],
  }),
}))
