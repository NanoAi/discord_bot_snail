import { Events } from 'discord.js'
import UserDBController from '@controllers/userController'
import GuildDBController from '@controllers/guildController'
import { logger } from '@utils/logger'
import { Client } from '@discord/discord'

Client.on(Events.GuildMemberAdd, async (member) => {
  // Do something on member join.
  const guildId = member.guild.id
  GuildDBController.where(guildId).upsertGuild(true).catch(logger.catchError)
  UserDBController.where(guildId, member.id).upsertUser().catch(logger.catchError)
})

Client.on(Events.GuildCreate, async (guild) => {
  logger.info(`[JOIN] ${guild.id}.`)
  GuildDBController.where(guild.id).upsertGuild()
})

Client.on(Events.GuildDelete, async (guild) => {
  logger.info(`[LEAVE] ${guild.id}.`)
  GuildDBController.where(guild.id).dropGuild()
})
