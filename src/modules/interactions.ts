import type { BitFieldResolvable, ColorResolvable, InteractionResponse, Message, MessageFlags } from 'discord.js'
import { EmbedBuilder } from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert } from '~/types/discord'

export function getChatInteraction(ci: ChatInteraction) {
  if (ci.interaction)
    return ci.interaction
  return ci.message!
}

export type MessageSend = Promise<Message<boolean> | InteractionResponse<boolean> | undefined>
export interface Style { colour: ColorResolvable, icon: string }
export const Styles = {
  Info: { colour: 0x0099FF, icon: 'https://cdn.discordapp.com/emojis/1276562523746865182.webp?size=56&quality=lossless' },
  Success: { colour: 0x00FF66, icon: 'https://cdn.discordapp.com/emojis/1276565485735116852.webp?size=56&quality=lossless' },
  Error: { colour: 0xFF001A, icon: 'https://cdn.discordapp.com/emojis/1276565574821871616.webp?size=56&quality=lossless' },
  Warn: { colour: 0xFFE600, icon: 'https://cdn.discordapp.com/emojis/1276566769867423848.webp?size=56&quality=lossless' },
  Misc: { colour: 0x00233B, icon: 'https://cdn.discordapp.com/emojis/1276563326448570500.webp?size=56&quality=lossless' },
}

const defaultOptions: {
  noReplace?: boolean
  flags?:
  BitFieldResolvable<
      'SuppressEmbeds' | 'SuppressNotifications',
      MessageFlags.SuppressEmbeds | MessageFlags.SuppressNotifications
  >
} = { noReplace: false, flags: undefined }

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

  getUser() {
    const ci = this.ci
    return (ci.interaction && ci.interaction.user) || (ci.message && ci.message.author) || undefined
  }

  async getGuildMember(user: any) {
    const guild = this.getGuild()
    if (!guild || !user)
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
  public settings: ReplySettings = { style: Styles.Misc }
  public embed: EmbedBuilder
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

  async send(response: string, options = defaultOptions): MessageSend {
    const _i = this.getInteraction()
    const message = this.getMessage()!
    const settings = this.settings
    const embed = this.embed

    this.embed.setColor(settings.style.colour)

    if (settings.label)
      this.embed.setFooter({ iconURL: settings.style.icon, text: `${settings.label.key}: ${settings.label.value}` })
    else
      this.embed.setFooter({ iconURL: settings.style.icon, text: `GU: ${this.getBoth().guildId}` })

    if (!options.noReplace) {
      response = response.replaceAll('%username%', _i && _i.user.username || message.author.username)
      embed.setDescription(`**${response}**`)
    }

    if (_i) {
      if (_i.replied)
        return

      const re = { embeds: [embed], fetchReply: true, ephemeral: !!settings.ephemeral }
      if (_i.deferred) {
        return await _i.editReply(re)
      }
      else {
        return await _i.reply(re)
      }
    }
    else {
      return await message.reply({ embeds: [embed], flags: options.flags! })
    }
  }
}

// TODO: Finish Implementing Direct Message.
export class DirectMessage extends Reply {
  constructor(ci: ChatInteraction) {
    super(ci)
    if (this.settings) // A direct message may not be ephemeral.
      this.settings.ephemeral = false
  }

  ephemeral(): this {
    return this
  }
}

export * as DiscordInteraction from '~/modules/interactions'
