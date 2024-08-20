import { Events } from 'discord.js'
import UserDBController from '@controllers/userController'
import GuildDBController from '@controllers/guildController'
import { logger } from '@utils/logger'
import { Client } from '~/modules/discord'

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return
  console.log(message.content)
  if (message.content === '??') {
    const member = message.member
    if (member) {
      const guildId = member.guild.id
      logger.info(`${member.id} joined ${guildId}`)
      GuildDBController.where(guildId).upsertGuild(true).catch(logger.catchError)
      UserDBController.where(guildId, member.id).upsertUser().catch(logger.catchError)
      message.reply('Simulating Client Join.')
    }
  }
  if (message.content === '?.') {
    const member = message.member
    GuildDBController.where(member!.guild.id).findGuild(true).then((out) => {
      console.log(out)
    }).catch(logger.catchError)
  }
})
