import { Events } from 'discord.js'
import { Client } from '~/modules/discord'
import UserDBController from '~/modules/controllers/userController'
import GuildDBController from '~/modules/controllers/guildController'
import { logger } from '~/modules/logger'

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return
  console.log(message.content)
  if (message.content === '??') {
    const member = message.member
    if (member) {
      const guildId = member.guild.id
      logger.info(`${member.id} joined ${guildId}`)
      GuildDBController.guild(guildId).upsertGuild(true).catch(logger.catchError)
      UserDBController.where(guildId, member.id).upsertUser().catch(logger.catchError)
      message.reply('Simulating Client Join.')
    }
  }
})
