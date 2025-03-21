import type { Channel } from 'discord.js'
import type { DT } from '~/types/discord'
import * as DI from '~/core/interactions'
import * as Discord from './discord'
import { SubCommandType as SBT } from './discord'

// const SCT = Discord.SubCommandType

export class Convert {
  public static async ValueToType(ci: DT.ChatInteraction, value: string, type: DT.SubCommandType) {
    switch (type) {
      case SBT.Bool:
        return this.Boolean(value)
      case SBT.String:
        return String(value)
      case SBT.Number:
        return Number(value)
      case SBT.User:
        return await this.User(ci, value)
      case SBT.Role:
        return await this.Role(ci, value)
      case SBT.Mentionable:
        return await this.Mentionable(ci, value)
      case SBT.Channel:
        return await this.Channel(ci, value)
      default:
        break
    }
  }

  public static async User(ci: DT.ChatInteraction, value: string | DT.UserLike) {
    if (value === '^')
      value = ci.author

    if (Discord.isUser(value))
      return value

    const cachedUser = Discord.Client.users.cache.get(value)
    if (!cachedUser) {
      return await Discord.Client.users.fetch(value)
    }

    return cachedUser || value
  }

  public static async Channel(ci: DT.ChatInteraction, value: string): Promise<Channel | undefined> {
    if (!ci)
      return undefined

    const snowflake = Discord.SnowflakeRegex.getSnowflake(value)
    if (!snowflake)
      return undefined

    value = snowflake

    const cache = Discord.Client.channels.cache.get(value)
    if (cache)
      return cache

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const channel = guild && guild.channels.cache.get(value)

    if (guild && !channel) {
      try {
        const fetchChannel = await guild.channels.fetch(value, { force: true })
        return fetchChannel || undefined
      }
      catch {
        return undefined
      }
    }

    return channel || undefined
  }

  public static async Role(ci: DT.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const role = guild && (guild.roles.cache.get(value) || await guild.roles.fetch(value, { force: true }))
    return role || undefined
  }

  public static async Mentionable(ci: DT.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const snowflake = Discord.SnowflakeRegex.getSnowflake(value)
    if (!snowflake)
      return undefined

    value = snowflake
    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild

    const role = guild && guild.roles.cache.get(value)
    const userCache = guild && guild.members.cache.get(value)
    const cachedUser = (userCache && userCache.user) || Discord.Client.users.cache.get(value)

    if (guild && !cachedUser) {
      try {
        const fetchMember = await guild.members.fetch({ user: value })
        return role || fetchMember.user
      }
      catch {
        return role || undefined
      }
    }

    return role || cachedUser
  }

  public static Boolean(value: string) {
    if (!value)
      return false

    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case '1':
        case 'y':
        case 'true':
          return true
        default:
          return false
      }
    }

    return Boolean(value)
  }
}
