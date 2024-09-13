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
  'cdn.discordapp.com',
]

Discord.Client.on(Events.MessageCreate, async (message) => {
  const member = message.member
  if (message.system || message.author.bot || !member)
    return

  const now = new Date()
  const dbInstance = new UserDBController(member)

  let dbUser = await dbInstance.getUser()

  if (!dbUser) {
    logger.warn(`Member (${member.id}) doesn\'t exist in guild (${member.guild.id}), creating.`)
    try {
      await dbInstance.upsertUser()
    }
    catch {
      logger.error(`Error: Could not create entry for member (${member.id}) in guild (${member.guild.id}).`)
      return
    }
    dbUser = await dbInstance.getUser()
  }

  if (dbUser.createdAt > dbUser.lastMessageDate) {
    const date = new Date()
    const messageMembers = message.mentions.members || new Collection()
    if (member.moderatable) {
      const urls = [...message.content.matchAll(/https?:\/\/([^ !@#$%^&*()[/\\\]]+)/g)]
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
    await dbInstance.updateUser({ lastMessageDate: now })
  }
  else {
    let days = dayjs(now).diff(dbUser.lastMessageDate, 'day')
    days = days > 5 ? 5 : days
    const xp = (days > 1) ? (dbUser.xp + 24) + (24 - Math.floor(24 / days)) : dbUser.xp
    await dbInstance.updateUser({ lastMessageDate: now, xp })
  }
})
