import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

// Guild table
export const Guild = pgTable("Guild", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enableXP: boolean("enableXP").notNull().default(true),
  earlyBirdFilter: boolean("earlyBirdFilter").notNull(),
  isPremium: boolean("isPremium").notNull(),
  trustedURLs: jsonb("trustedURLs").notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  pruneWhen: integer("pruneWhen").notNull(),
});

// User table
export const User = pgTable("User", {
  id: text("id").primaryKey(),
  guildId: text("guildId").notNull().references(() => Guild.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  username: text("username").notNull(),
  nickname: text("nickname").notNull(),
  xp: integer("xp").notNull(),
  heat: integer("heat").notNull(),
  level: integer("level").notNull(),
  lastMessageDate: timestamp("lastMessageDate", { precision: 3 }),
  lastKudosDate: timestamp("lastKudosDate", { precision: 3 })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  roles: jsonb("roles").notNull(),
});

// Case table
export const Case = pgTable("Case", {
  id: serial("id").primaryKey(),
  guildId: text("guildId").notNull().references(() => Guild.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  userId: text("userId").notNull().references(() => User.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  actorId: text("actorId").notNull(),
  description: text("description").notNull(),
});

// Action table
export const Action = pgTable("Action", {
  id: serial("id").primaryKey(),
  caseId: integer("caseId").notNull().references(() => Case.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  actionType: integer("actionType").notNull(),
  reason: text("reason").notNull(),
  userId: text("userId").notNull(),
  actorId: text("actorId").notNull(),
  timestamp: timestamp("timestamp", { precision: 3 }).notNull().defaultNow(),
});

// Ticket table
export const Ticket = pgTable("Ticket", {
  id: serial("id").primaryKey(),
  caseId: integer("caseId").notNull().references(() => Case.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  status: integer("status").notNull(),
  issue: text("issue").notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
});

// Relations
export const GuildRelations = relations(Guild, ({ many }) => ({
  users: many(User, { relationName: "GuildToUser" }),
  cases: many(Case, { relationName: "CaseToGuild" }),
}));

export const UserRelations = relations(User, ({ one, many }) => ({
  guild: one(Guild, {
    relationName: "GuildToUser",
    fields: [User.guildId],
    references: [Guild.id],
  }),
  cases: many(Case, { relationName: "CaseToUser" }),
}));

export const CaseRelations = relations(Case, ({ one, many }) => ({
  actions: many(Action, { relationName: "ActionToCase" }),
  tickets: many(Ticket, { relationName: "CaseToTicket" }),
  guild: one(Guild, {
    relationName: "CaseToGuild",
    fields: [Case.guildId],
    references: [Guild.id],
  }),
  user: one(User, {
    relationName: "CaseToUser",
    fields: [Case.userId],
    references: [User.id],
  }),
}));

export const ActionRelations = relations(Action, ({ one }) => ({
  case: one(Case, {
    relationName: "ActionToCase",
    fields: [Action.caseId],
    references: [Case.id],
  }),
}));

export const TicketRelations = relations(Ticket, ({ one }) => ({
  case: one(Case, {
    relationName: "CaseToTicket",
    fields: [Ticket.caseId],
    references: [Case.id],
  }),
}));
