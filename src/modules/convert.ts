import * as Discord from './discord'
import type { DT } from '~/types/discord'
import * as DI from '~/modules/interactions'

const SCT = Discord.SubCommandType

export class Convert {
  public static async ValueToType(ci: DT.ChatInteraction, value: string, type: DT.SubCommandType) {
    switch (type) {
      case SCT.Bool:
        return this.Boolean(value)
      case SCT.String:
        return String(value)
      case SCT.Number:
        return Number(value)
      case SCT.User:
        return this.User(value)
      case SCT.Role:
        return this.Role(ci, value)
      case SCT.Mentionable:
        return await this.Mentionable(ci, value)
      default:
        break
    }
  }

  public static User(value: string | DT.UserLike) {
    if (Discord.isUser(value))
      return value

    const cachedUser = Discord.Client.users.cache.get(value)
    if (!cachedUser) {
      return Discord.Client.users.fetch(value)
    }

    return cachedUser || value
  }

  public static Role(ci: DT.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const role = guild && (guild.roles.cache.get(value) || guild.roles.fetch(value, { force: true }))
    return role || undefined
  }

  public static async Mentionable(ci: DT.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const guildId = guild && inter.guildId || undefined

    if (value === guildId)
      return '@everyone'

    const isSnowflake = String(value).match(/^(?:<@!?)?(\d{17,19})>?$/) && true || false
    if (!isSnowflake)
      return undefined

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
