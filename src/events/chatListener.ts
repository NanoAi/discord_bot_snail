import { Collection, Events } from 'discord.js'
import { UserDBController } from '@controllers/user'
import { logger } from '@utils/logger'
import * as Discord from '~/modules/discord'
import dayjs from '~/modules/utils/dayjs'

const allowedURLS = [
  'tenor.com',
  'imgur.com',
  'reddit.com',
  'youtube.com',
  'twitch.tv',
  'example.com',
  'twitter.com',
  'x.com',
  'fxtwitter.com',
  'fixupx.com',
  'twittpr.com',
]

Discord.Client.on(Events.MessageCreate, async (message) => {
  const member = message.member
  if (message.system || message.author.bot || !member)
    return

  // const guild = member.guild
  const dbInstance = new UserDBController(member)
  const dbUser = await dbInstance.getUser(false)
  // const snippet = String(message.content).trim().substring(0, 256).toLowerCase()

  logger.info(`DBUser: ${dbUser}`)
  console.log(dbUser)

  if (!dbUser) {
    logger.error(`The associated member (${member.id}) doesn\'t exist in guild (${member.guild.id}).`)
    return
  }

  if (dbUser.createdAt > dbUser.lastMessageDate) {
    const date = new Date()
    const messageMembers = message.mentions.members || new Collection()
    if (member.moderatable) {
      const urls = [...message.content.matchAll(/https?:\/{2}([^ !@#$%^&*()[/\\\]]+)/g)]
      if (message.mentions.everyone || messageMembers.size > 3) {
        if (message.deletable)
          await message.delete()
        member.disableCommunicationUntil(dayjs(date).add(48, 'h').toDate(), 'Mention spam in initial message.')
      }
      else {
        if ((urls && urls.length > 0) && (urls[0].length > 1 && urls[0][1])) {
          const url = String(urls[0][1]).toLowerCase()
          if (!allowedURLS.includes(url) && message.deletable) {
            await message.delete()
            member.disableCommunicationUntil(dayjs(date).add(3, 'h').toDate(), 'Unrecognized link in initial message.')
          }
        }
      }
    }
    if (message.content.length < 6)
      return
    await dbInstance.updateUser({ lastMessageDate: new Date() })
  }
  else {
    await dbInstance.updateUser({ lastMessageDate: new Date() })
  }
})
