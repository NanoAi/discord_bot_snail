import { Events } from 'discord.js'
import { Client } from '~/modules/discord'
import { logger } from '~/modules/logger'
import UserDBController from '~/modules/controllers/userController'
import GuildDBController from '~/modules/controllers/guildController'

Client.on(Events.GuildMemberAdd, async (member) => {
  // Do something on member join.
  UserDBController.where(member.guild.id, member.id).upsertUser()
})

Client.on(Events.GuildCreate, async (guild) => {
  logger.info(`[JOIN] ${guild.id}.`)
  GuildDBController.guild(guild.id).upsertGuild()
})

Client.on(Events.GuildDelete, async (guild) => {
  logger.info(`[LEAVE] ${guild.id}.`)
  GuildDBController.guild(guild.id).dropGuild()
})
