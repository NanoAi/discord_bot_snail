import type { SubCommandType } from '~/class/discord'
import * as Discord from '~/class/discord'

export class Convert {
  public static ValueToType(ci: Discord.ChatInteraction, value: string, type: SubCommandType) {
    switch (type) {
      case 'boolean':
        return this.Boolean(value)
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'mentionable':
        return this.Mentionable(ci, value)
      default:
        break
    }
  }

  public static Mentionable(ci: Discord.ChatInteraction, value: string) {
    if (ci.interaction) {
      const guild = ci.interaction.inGuild() && ci.interaction.guild
      const guildId = guild && ci.interaction.guildId || undefined
      if (value === guildId)
        return '@everyone'
      const role = guild && guild.roles.cache.get(value)
      const user = Discord.Client.users.cache.get(value)
      return role || user!
    }
    else {
      const guild = ci.message!.inGuild() && ci.message.guild
      const guildId = guild && ci.message!.guildId || undefined
      if (value === guildId)
        return '@everyone'
      const role = guild && guild.roles.cache.get(value)
      const user = Discord.Client.users.cache.get(value)
      return role || user!
    }
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
