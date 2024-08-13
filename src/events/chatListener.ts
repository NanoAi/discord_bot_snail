import { Events } from 'discord.js'
import { Client } from '~/modules/discord'
import MongoDBController from '~/modules/db'
import { logger } from '~/modules/logger'

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return
  console.log(message.content)
  if (message.content === '?Pretend I just joined.') {
    const member = message.member
    if (member) {
      const guildId = member.guild.id
      logger.info(`${member.id} joined ${guildId}`)
      MongoDBController.patch(guildId).then(db => db.upsertUser(member.id))
      message.reply('Welcome!')
    }
  }
})
