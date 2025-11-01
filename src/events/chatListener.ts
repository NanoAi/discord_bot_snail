import { UserDBController } from '@controllers/user'
import { Collection, Events, Message, OmitPartialGroupDMChannel } from 'discord.js'
import * as Discord from '~/core/discord'
import dayjs from '~/core/utils/dayjs'
import { xpToLevel } from '~/core/utils/levels'
import { logger } from '~/core/utils/logger'

const allowedURLS = [
  'tenor.com',
  'example.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'images-ext-1.discordapp.net',
  'images-ext-2.discordapp.net',
]

async function updateUser(
  now: Date,
  dbInstance: UserDBController,
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (message.content.length > 6) {
    await dbInstance.updateUser({ lastMessageDate: now })
  }
}

Discord.Client.on(Events.MessageCreate, async (message) => {
  const member = message.member
  if (message.system || message.author.bot || !member)
    return

  const now = new Date()
  const dbInstance = new UserDBController(member)

  const dbUser = await dbInstance.getOrCreateUser()
  if (!dbUser) {
    return
  }

  const inThreshold = (dbUser.initMessageDate == null) ? true :
    dayjs(dbUser.initMessageDate).diff(now, 's') < 15

  logger.info(`in: ${inThreshold} | ${dayjs(dbUser.initMessageDate).diff(now, 's')}`)

  if (inThreshold) {
    const messageMembers = message.mentions.members || new Collection()

    if (!member.moderatable) {
      await updateUser(now, dbInstance, message)
      return
    }

    // Mute users who try to ping everyone, or mention more than 3 people.
    if (message.mentions.everyone || messageMembers.size > 3) {
      if (message.deletable) {
        await message.delete()
      }
      member.disableCommunicationUntil(
        dayjs(now).add(1, 'h').toDate(),
        'Mention spam in initial message.'
      )
      await updateUser(now, dbInstance, message)
      return
    }

    // Mute users who try to post a link as soon as they join the server.
    const urls = [...message.content.matchAll(/https?:\/\/[^ ]+/g)]
    if ((urls && urls.length > 0) && urls[0].length) {
      for (const v of urls[0]) {
        const url = String(v).toLowerCase()
        if (!allowedURLS.includes(url) && message.deletable) {
          await message.delete()
          member.disableCommunicationUntil(
            dayjs(now).add(15, 'm').toDate(),
            'Unrecognized link in initial message.'
          )
          break
        }
      }
    }

    if (dbUser.initMessageDate == null) {
      await dbInstance.updateUser({ initMessageDate: now })
    }

    await updateUser(now, dbInstance, message)
  }
  else if (dbUser.lastMessageDate instanceof Date) {
    let days = dayjs(now).diff(dbUser.lastMessageDate, 'day')
    days = days > 5 ? 5 : days

    const xp = (days > 1) ? (dbUser.xp + 24) + (24 - Math.floor(24 / days)) : dbUser.xp
    await dbInstance.updateUser({ lastMessageDate: now, xp, level: xpToLevel(xp) })
  }
})
