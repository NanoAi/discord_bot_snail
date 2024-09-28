import { Events } from 'discord.js'
import { UserDBController } from '@controllers/user'
import { GuildDBController } from '@controllers/guild'
import { logger } from '~/core/utils/logger'
import { Client } from '~/core/discord'

Client.on(Events.GuildMemberAdd, async (member) => {
  // Do something on member join.
  GuildDBController.instance(member.guild).upsertGuild().catch(logger.catchError)
  UserDBController.instance(member).upsertUser().catch(logger.catchError)
})

Client.on(Events.GuildCreate, async (guild) => {
  logger.info(`[JOIN] ${guild.id}.`)
  GuildDBController.instance(guild).upsertGuild()
})

Client.on(Events.GuildDelete, async (guild) => {
  logger.info(`[LEAVE] ${guild.id}.`)
  GuildDBController.instance(guild).dropGuild()
})
