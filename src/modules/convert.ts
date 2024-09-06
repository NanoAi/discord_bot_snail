import type { SubCommandType } from './discord'
import * as Discord from './discord'
import * as DI from '~/modules/interactions'

export class Convert {
  public static ValueToType(ci: Discord.ChatInteraction, value: string, type: SubCommandType) {
    switch (type) {
      case 'boolean':
        return this.Boolean(value)
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'integer':
        return Number(value)
      case 'double':
        return Number(value)
      case 'user':
        return this.User(value)
      case 'role':
        return this.Role(ci, value)
      case 'mentionable':
        return this.Mentionable(ci, value)
      default:
        break
    }
  }

  public static User(value: string) {
    return Discord.Client.users.cache.get(value)
  }

  public static Role(ci: Discord.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const role = guild && guild.roles.cache.get(value)
    return role || undefined
  }

  public static Mentionable(ci: Discord.ChatInteraction, value: string) {
    if (!ci)
      return undefined

    const inter = DI.getChatInteraction(ci)
    const guild = inter.inGuild() && inter.guild
    const guildId = guild && inter.guildId || undefined

    if (value === guildId)
      return '@everyone'

    const role = guild && guild.roles.cache.get(value)
    const user = Discord.Client.users.cache.get(value)

    return role || user!
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
