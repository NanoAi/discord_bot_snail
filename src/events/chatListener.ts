import { UserDBController } from '@controllers/user'
import { Collection, Events, Message, OmitPartialGroupDMChannel } from 'discord.js'
import * as Discord from '~/core/discord'
import dayjs from '~/core/utils/dayjs'
import { xpToLevel } from '~/core/utils/levels'

const allowedURLS = [
  'tenor.com',
  'example.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
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

  if (dbUser.createdAt > dbUser.lastMessageDate) {
    const date = new Date()
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
        dayjs(date).add(15, 'm').toDate(),
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
            dayjs(date).add(5, 'm').toDate(),
            'Unrecognized link in initial message.'
          )
          break
        }
      }
    }

    await updateUser(now, dbInstance, message)
  }
  else {
    let days = dayjs(now).diff(dbUser.lastMessageDate, 'day')
    days = days > 5 ? 5 : days

    const xp = (days > 1) ? (dbUser.xp + 24) + (24 - Math.floor(24 / days)) : dbUser.xp
    await dbInstance.updateUser({ lastMessageDate: now, xp, level: xpToLevel(xp) })
  }
})
