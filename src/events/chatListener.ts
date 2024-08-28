import type { Message } from 'discord.js'
import { Events } from 'discord.js'
import UserDBController from '@controllers/userController'
import GuildDBController from '@controllers/guildController'
import { logger } from '@utils/logger'
import { EventController } from '~/modules/decorators'

// TODO: Add priority.
@EventController.bind(Events.MessageCreate)
export class onMessageCreate {
  async main(message: Message<boolean>) {
    if (message.system || message.author.bot)
      return
    console.log('[MSG]', message.content)
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
        console.log('[MSG]', out)
      }).catch(logger.catchError)
    }
  }
}
