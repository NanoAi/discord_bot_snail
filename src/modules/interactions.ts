import type { ColorResolvable, GuildMember, InteractionReplyOptions, MessageReplyOptions, User } from 'discord.js'
import { EmbedBuilder } from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert } from './discord'
import * as Discord from './discord'

export function getChatInteraction(ci: ChatInteraction) {
  if (ci.interaction)
    return ci.interaction
  return ci.message!
}

export interface Style { colour: ColorResolvable, icon: string }
export const Styles = {
  Info: { colour: 0x0099FF, icon: 'https://cdn.discordapp.com/emojis/1276562523746865182.webp?size=56&quality=lossless' },
  Success: { colour: 0x00FF66, icon: 'https://cdn.discordapp.com/emojis/1276565485735116852.webp?size=56&quality=lossless' },
  Error: { colour: 0xFF001A, icon: 'https://cdn.discordapp.com/emojis/1276565574821871616.webp?size=56&quality=lossless' },
  Warn: { colour: 0xFFE600, icon: 'https://cdn.discordapp.com/emojis/1276566769867423848.webp?size=56&quality=lossless' },
  Misc: { colour: 0x00233B, icon: 'https://cdn.discordapp.com/emojis/1276563326448570500.webp?size=56&quality=lossless' },
}

/**
 * enum LabelKeys
 */
export enum LabelKeys {
  ID = 'ID',
  GUILD = 'GU',
}

class CommandInteractionCallback {
  private lock: boolean = false
  private ci: ChatInteraction

  constructor(ci: ChatInteraction) {
    this.ci = ci
    return this
  }

  interaction(callback: (interaction: ChatInteractionAssert['interaction']) => void) {
    if (!this.lock && this.ci.interaction) {
      callback(this.ci.interaction)
      this.lock = true
    }
    return this
  }

  message(callback: (message: ChatInteractionAssert['message']) => void) {
    if (!this.lock && this.ci.message) {
      callback(this.ci.message)
      this.lock = true
    }
    return this
  }
}

export class CommandInteraction {
  private ci: ChatInteraction

  constructor(ci: ChatInteraction) {
    this.ci = ci
    return this
  }

  getBoth() {
    const ci = this.ci
    return (ci.interaction || ci.message)!
  }

  getInteraction() {
    return this.ci.interaction
  }

  getMessage() {
    return this.ci.message
  }

  getGuild() {
    const ci = this.ci
    const guild = ci.interaction && ci.interaction.guild || ci.message && ci.message.guild || undefined
    return guild
  }

  async getGuildMember(user: any) {
    const guild = this.getGuild()
    if (!guild)
      return undefined
    try {
      const member = await guild.members.fetch({ user, force: true })
      return member
    }
    catch {
      return undefined
    }
  }

  callback() {
    return new CommandInteractionCallback(this.ci)
  }
}

export async function acceptInteraction(ci: ChatInteraction) {
  if (ci.interaction) {
    await ci.interaction.reply({ content: '## 🆗', ephemeral: true })
    return ci.interaction
  }
  else {
    await ci.message!.react('🆗')
    return ci.message
  }
}

interface ReplySettings {
  label?: { key: string, value: string }
  ephemeral?: boolean
  style: Style
}

export class Reply extends CommandInteraction {
  private settings: ReplySettings = { style: Styles.Misc }
  private embed: EmbedBuilder
  constructor(ci: ChatInteraction) {
    super(ci)

    const settings = this.settings
    const style = settings.style

    this.embed = new EmbedBuilder()
      .setColor(style.colour)
      .setTimestamp()

    return this
  }

  style(style: Style) {
    this.settings.style = style
    return this
  }

  label(key: LabelKeys, value: string) {
    this.settings.label = { key, value }
    return this
  }

  ephemeral(beEphemeral: boolean) {
    this.settings.ephemeral = beEphemeral
    return this
  }

  async send(response: string, noReplace: boolean = false) {
    const _i = this.getInteraction()
    const message = this.getMessage()!
    const settings = this.settings
    const embed = this.embed

    this.embed.setColor(settings.style.colour)

    if (settings.label)
      this.embed.setFooter({ iconURL: settings.style.icon, text: `${settings.label.key}: ${settings.label.value}` })
    else
      this.embed.setFooter({ iconURL: settings.style.icon, text: `GU: ${this.getBoth().guildId}` })

    if (!noReplace) {
      response = response.replaceAll('%username%', _i && _i.user.username || message.author.username)
      embed.setDescription(`**${response}**`)
    }

    if (_i) {
      if (_i.replied)
        return

      const re = { embeds: [embed], fetchReply: true, ephemeral: !!settings.ephemeral }
      if (_i.deferred) {
        await _i.editReply(re)
      }
      else {
        await _i.reply(re)
      }
    }
    else {
      await message.reply({ embeds: [embed] })
    }
  }
}

export * as DiscordInteraction from '~/modules/interactions'
