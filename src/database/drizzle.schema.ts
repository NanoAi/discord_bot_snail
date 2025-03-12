import { relations } from 'drizzle-orm'
import { boolean, foreignKey, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const Guild = pgTable('Guild', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  enableXP: boolean('enableXP').notNull().default(true),
  earlyBirdFilter: boolean('earlyBirdFilter').notNull(),
  isPremium: boolean('isPremium').notNull(),
  trustedURLs: jsonb('trustedURLs').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  pruneWhen: integer('pruneWhen').notNull(),
})

export const User = pgTable('User', {
  id: text('id').notNull().primaryKey(),
  guildId: text('guildId').notNull(),
  username: text('username').notNull(),
  nickname: text('nickname').notNull(),
  xp: integer('xp').notNull(),
  heat: integer('heat').notNull(),
  level: integer('level').notNull(),
  lastMessageDate: timestamp('lastMessageDate', { precision: 3 }).notNull(),
  lastKudosDate: timestamp('lastKudosDate', { precision: 3 }).notNull().defaultNow(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  roles: jsonb('roles').notNull(),
}, User => ([
  foreignKey({
    name: 'User_guild_fkey',
    columns: [User.guildId],
    foreignColumns: [Guild.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
]))

export const Case = pgTable('Case', {
  id: serial('id').notNull().primaryKey(),
  guildId: text('guildId').notNull(),
  userId: text('userId').notNull(),
  actorId: text('actorId').notNull(),
  description: text('description').notNull(),
}, Case => ([
  foreignKey({
    name: 'Case_guild_fkey',
    columns: [Case.guildId],
    foreignColumns: [Guild.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
  foreignKey({
    name: 'Case_user_fkey',
    columns: [Case.userId],
    foreignColumns: [User.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
]))

export const Action = pgTable('Action', {
  id: serial('id').notNull().primaryKey(),
  caseId: integer('caseId').notNull(),
  actionType: integer('actionType').notNull(),
  reason: text('reason').notNull(),
  userId: text('userId').notNull(),
  actorId: text('actorId').notNull(),
  timestamp: timestamp('timestamp', { precision: 3 }).notNull().defaultNow(),
}, Action => ([
  foreignKey({
    name: 'Action_case_fkey',
    columns: [Action.caseId],
    foreignColumns: [Case.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
]))

export const Ticket = pgTable('Ticket', {
  id: serial('id').notNull().primaryKey(),
  caseId: integer('caseId').notNull(),
  status: integer('status').notNull(),
  issue: text('issue').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
}, Ticket => ([
  foreignKey({
    name: 'Ticket_case_fkey',
    columns: [Ticket.caseId],
    foreignColumns: [Case.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
]))

export const Forum = pgTable('Forum', {
  id: text('id').notNull().primaryKey(),
  guildId: text('guildId').notNull(),
  managed: boolean('managed').notNull(),
  bump: integer('bump').notNull(),
}, Forum => ([
  foreignKey({
    name: 'Forum_guild_fkey',
    columns: [Forum.guildId],
    foreignColumns: [Guild.id],
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
]))

export const GuildRelations = relations(Guild, ({ many }) => ({
  users: many(User, {
    relationName: 'GuildToUser',
  }),
  cases: many(Case, {
    relationName: 'CaseToGuild',
  }),
  forums: many(Forum, {
    relationName: 'ForumToGuild',
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

export const ForumRelations = relations(Forum, ({ one }) => ({
  guild: one(Guild, {
    relationName: 'ForumToGuild',
    fields: [Forum.guildId],
    references: [Guild.id],
  }),
}))
