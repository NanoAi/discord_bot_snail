import type {
  APIEmbedField,
  BitFieldResolvable,
  ColorResolvable,
  InteractionResponse,
  Message,
  MessageFlags,
  RestOrArray,
  User,
} from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember } from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert, UserLike } from '~/types/discord'
import type { Maybe } from '~/types/util'

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

  getAuthor() {
    return this.ci.author
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
    const guild = (ci.interaction && ci.interaction.guild) || (ci.message && ci.message.guild) || undefined
    return guild
  }

  getUser() {
    const ci = this.ci
    return (ci.interaction && ci.interaction.user) || (ci.message && ci.message.author) || undefined
  }

  async getGuildMember(user: Maybe<UserLike> = this.getUser()) {
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

  new() {
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
  useTitle?: boolean
  ephemeral?: boolean
  style: Style
}

export class Reply extends CommandInteraction {
  public fields?: RestOrArray<APIEmbedField>
  public title: string = ''
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

  isBotInteraction(user: UserLike) {
    if (user.bot) {
      this.send(`Sorry, I can not run this command on ${user}.`)
      return true
    }
    return false
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

  setTitle(title: string) {
    this.settings.useTitle = true
    this.title = title
    return this
  }

  setFields(...fields: RestOrArray<APIEmbedField>) {
    this.fields = fields
    return this
  }

  async send(response: string, options = defaultOptions): MessageSend {
    const _i = this.getInteraction()
    const message = this.getMessage()!
    const settings = this.settings
    const embed = this.embed

    this.embed.setColor(settings.style.colour)

    if (this.fields)
      this.embed.addFields(...this.fields)

    if (settings.label)
      this.embed.setFooter({ iconURL: settings.style.icon, text: `${settings.label.key}: ${settings.label.value}` })
    else
      this.embed.setFooter({ iconURL: settings.style.icon, text: `GU: ${this.getBoth().guildId}` })

    if (!options.noReplace) {
      response = response.replaceAll('%username%', (_i && _i.user.username) || message.author.username)

      if (!settings.useTitle)
        embed.setDescription(`**${response}**`)
      else
        embed.setDescription(`### ${this.title}\n<:quote:1285270560967753849> **${response}**`)
    }

    try {
      if (_i) {
        if (_i.replied)
          return

        const re = { embeds: [embed], fetchReply: true, ephemeral: !!settings.ephemeral }
        if (_i.deferred) {
          return await _i.editReply(re)
        }
        else {
          return await _i.reply({ embeds: [embed], ephemeral: !!settings.ephemeral })
        }
      }
      else {
        return await message.reply({ embeds: [embed], flags: options.flags })
      }
    }
    catch {
      // TODO: Add a "console" channel to catch errors etc.
      if (message.channel.isSendable())
        message.channel.send({ embeds: [embed], flags: options.flags })
    }
  }
}

export class DirectMessage extends Reply {
  private actionRow?: any
  private user?: User

  constructor(ci: ChatInteraction) {
    super(ci)
    if (this.settings) // A direct message may not be ephemeral.
      this.settings.ephemeral = false
  }

  ephemeral(): this {
    return this
  }

  to(user: User | GuildMember): this {
    this.user = (user instanceof GuildMember) ? user.user : user
    return this
  }

  async send(message: string, options = defaultOptions): MessageSend {
    const component = this.getBoth()
    const settings = this.settings
    const embed = this.embed

    if (!this.user)
      throw new Error('Attempted to send message before a user was defined.')

    this.embed.setColor(settings.style.colour)

    if (settings.label)
      this.embed.setFooter({ iconURL: settings.style.icon, text: `${settings.label.key}: ${settings.label.value}` })
    else
      this.embed.setFooter({ iconURL: settings.style.icon, text: `GU: ${component.guildId}` })

    if (component.guild) {
      const source = new ButtonBuilder()
        .setLabel(component.guild?.name || '')
        .setURL(`https://discord.com/channels/${component.guildId}`)
        .setEmoji('1285236737538392105')
        .setStyle(ButtonStyle.Link)

      this.actionRow = new ActionRowBuilder().addComponents(source)
    }

    if (!options.noReplace) {
      message = message.replaceAll('%username%', this.user.username)
      if (!settings.useTitle)
        embed.setDescription(`**${message}**`)
      else
        embed.setDescription(`### ${this.title}\n\`-\` **${message}**`)
    }

    return await this.user.send({
      embeds: [embed],
      flags: options.flags,
      components: (this.actionRow && [this.actionRow]) || undefined,
    })
  }
}

export * as DiscordInteraction from '~/core/interactions'
