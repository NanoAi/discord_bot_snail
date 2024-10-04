import type { Message, OmitPartialGroupDMChannel } from 'discord.js'
import { UserDBController } from '@controllers/user'
import { Collection, Events } from 'discord.js'
import { ForumController } from '~/controllers/forum'
import { SystemCache } from '~/core/cache'
import * as Discord from '~/core/discord'
import dayjs from '~/core/utils/dayjs'
import { xpToLevel } from '~/core/utils/levels'
import { logger } from '~/core/utils/logger'
import type { ForumDB } from '~/types/controllers'

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

const forumController = new ForumController()
const guildForumCache = SystemCache.global().getGuildForums()

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
      await message.react('‼️')
      await member.timeout(cache.settings.bump * 1000, 'Thread Bumping.')
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
