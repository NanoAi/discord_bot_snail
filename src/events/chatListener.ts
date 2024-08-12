import { Events } from 'discord.js'
import { Client } from '~/modules/discord'

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return
  console.log(message.content)
})
