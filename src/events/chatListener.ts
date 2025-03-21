import type { Message, OmitPartialGroupDMChannel } from 'discord.js'
import type { ForumDB } from '~/types/controllers'
import { UserDBController } from '@controllers/user'
import { Collection, Events } from 'discord.js'
import { ForumController } from '~/controllers/forum'
import { SystemCache } from '~/core/cache'
import * as Discord from '~/core/discord'
import dayjs from '~/core/utils/dayjs'
import { xpToLevel } from '~/core/utils/levels'
import { logger } from '~/core/utils/logger'

const allowedURLS = [
  'tenor.com',
  'example.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
]

const forumController = new ForumController()
const guildForumCache = SystemCache.global().getGuildForums()

Discord.Client.on(Events.MessageCreate, async (message) => {
  const member = message.member
  if (message.system || message.author.bot || !member)
    return

  const now = new Date()
  const dbInstance = new UserDBController(member)

  const dbUser = await dbInstance.getOrCreateUser()
  if (!dbUser)
    return

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
        if ((urls && urls.length > 0) && urls[0].length) {
          for (const v of urls[0]) {
            const url = String(v).toLowerCase()
            if (!allowedURLS.includes(url) && message.deletable) {
              await message.delete()
              member.disableCommunicationUntil(dayjs(date).add(3, 'h').toDate(), 'Unrecognized link in initial message.')
              break
            }
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
    await dbInstance.updateUser({ lastMessageDate: now, xp, level: xpToLevel(xp) })
  }
})

interface CacheType {
  id: string
  settings: ForumDB['select'] | undefined
  found: boolean
}

async function bumpHandler(cache: CacheType, message: OmitPartialGroupDMChannel<Message<boolean>>) {
  const content = message.content.toLowerCase()
  const member = message.member!
  const regex = /(?:^|^.\{,6\})<:\w+:\d+>|^bump|^solve/

  if (!cache || !cache.settings)
    return

  if (cache.settings.bump === 0)
    return

  if (content.length <= 6 || regex.test(content)) {
    try {
      const userController = new UserDBController(member)
      await message.react('‼️')
      await member.timeout(cache.settings.bump * 1000, 'Thread Bumping.')
      const userData = await userController.getUser()
      userController.updateUser({ heat: userData.heat + 2 })
    }
    catch (e: any) {
      if (e.code !== 50013)
        logger.error(e)
    }
  }
}

Discord.Client.on(Events.MessageCreate, async (message) => {
  const member = message.member
  if (message.system || message.author.bot || !member)
    return

  if (!message.inGuild())
    return

  const guildId = message.guildId
  const channel = message.channel

  if (channel.isThread() && channel.parentId) {
    const cache: CacheType[] = guildForumCache.get(message.guildId) || []
    const hit = cache.find(v => v.id === channel.parentId)
    if (hit) {
      if (!hit.found)
        return
      bumpHandler(hit, message)
      return
    }
    const db = (await forumController.getGuildForumById(guildId, channel.parentId)).pop()
    let data: CacheType = { id: channel.parentId, settings: undefined, found: false }
    if (db)
      data = { id: data.id, settings: db, found: true }
    cache.push(data)
    bumpHandler(data, message)
    guildForumCache.set(message.guildId, cache)
  }
})
