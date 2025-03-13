import type {
  APIEmbedField,
  BitFieldResolvable,
  ColorResolvable,
  Guild,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  MessageReplyOptions,
  RestOrArray,
  User,
} from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert, InteractionInit, UserLike } from '~/types/discord'
import type { Maybe } from '~/types/util'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from 'discord.js'
import { assertAs, CheckAs, isDefinedAs, validateAs } from './utils/assert'
import { logger } from './utils/logger'

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
  useQuote?: boolean
  noReplace?: boolean
  unwrap?: boolean
  silence?: boolean
  flags?: BitFieldResolvable<any, any>
} = { useQuote: false, noReplace: false, unwrap: false, silence: false, flags: undefined }

/**
 * enum LabelKeys
 */
export enum LabelKeys {
  ID = 'ID',
  GUILD = 'GU',
  NONE = '_',
}

function attachEmbed(
  _class: Reply | DirectMessage,
  response: Maybe<string>,
  prefix: string,
  suffix: string,
  options = defaultOptions,
) {
  const _i = _class.getInteraction()
  const message = _class.getMessage()
  const settings = _class.settings
  const embed = _class.embed

  if (!response)
    return

  if (!options.noReplace) {
    response = response.replaceAll('%username%', (_i && _i.user.username) || message?.author.username || 'user')
    response = response.replaceAll('%%', '```')
  }

  const data = {
    title: settings.useTitle ? `${prefix}${_class.title}${suffix}` : undefined,
    response: '',
  }

  if (options.unwrap) {
    response = response
      .replaceAll(/\t+| {3,}/g, '')
      .replaceAll(/^\n|\n$|^[^\S\n]+|[^\S\n]+$/g, '')
      .replaceAll(/\n{2,}/g, '')
  }

  data.response = options.useQuote ? `<:quote:1295782463536365578> **${response}**` : `**${response}**`

  // embed.setDescription(`### ${this.title}\n<:quote:1285270560967753849> **${response}**`)
  // embed.setDescription(`### ${this.title}\n\`-\` **${message}**`)
  if (settings.useTitle)
    embed.setDescription(`${data.title}${data.response}`)
  else
    embed.setDescription(`${data.response}`)
}

async function sendMessagePayload(
  _class: Reply | DirectMessage | CommandInteraction,
  ephemeral: boolean,
  options = defaultOptions,
  payload: {
    content?: string
    data?: MessagePayload | MessageReplyOptions
    embeds?: EmbedBuilder[]
  } = {},
) {
  const _i = _class.getInteraction()
  const message = isDefinedAs<Message>(_class.getMessage(), CheckAs.Message)
  payload.data = { content: payload.content, embeds: payload.embeds, flags: options.flags }

  if (!payload.content && !payload.embeds)
    throw new Error('Data must be provided to send a message payload.')

  if (options.silence) {
    options.flags = options.flags | MessageFlags.SuppressNotifications
    payload.data.allowedMentions = { parse: [] }
  }

  try {
    if (_i) {
      if (_i.replied)
        return

      const re = {
        content: payload.content,
        embeds: payload.embeds,
        withResponse: true,
        flags: options.flags,
      } as InteractionReplyOptions | InteractionEditReplyOptions
      re.allowedMentions = payload.data.allowedMentions

      if (ephemeral)
        re.flags = options.flags | MessageFlags.Ephemeral

      if (_i.deferred) {
        return await _i.editReply(re as InteractionEditReplyOptions)
      }
      else {
        return await _i.reply(re as InteractionReplyOptions)
      }
    }
    else {
      if (!message)
        throw new Error('No message data to process, is there a message to attach to?')
      await message.reply(payload.data)
    }
  }
  catch (eInfo) {
    // TODO: Add a "console" channel to catch errors etc.
    if (_i && (eInfo as any).code === 10062) {
      logger.error('[10062] Expected reply took too long.')
      return
    }

    const channel = message
      ? message.channel ?? (await message.fetch(true)).channel
      : null

    if (!channel?.isSendable()) {
      logger.error('Could not find a valid channel to post in.')
      console.log(eInfo)
      return
    }

    await channel.send(payload.data)
  }
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
  private isSilent = false

  constructor(ci: ChatInteraction) {
    this.ci = ci
    return this
  }

  getAuthor() {
    return this.ci.author
  }

  getInitializer() {
    const ci = this.ci
    return assertAs<InteractionInit>((ci.interaction || ci.message), CheckAs.InteractionInit)
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
    return isDefinedAs<Guild>(guild, CheckAs.Guild)
  }

  getGuildAsync() {
    return validateAs<Guild>(this.getGuild(), CheckAs.Guild)
  }

  getUser() {
    const ci = this.ci
    const user = (ci.interaction && ci.interaction.user) || (ci.message && ci.message.author) || undefined
    return isDefinedAs<User>(user, CheckAs.User)
  }

  async defer() {
    const _i = this.getInteraction()
    if (_i)
      await _i.deferReply()
    return this
  }

  getSilent() {
    return this.isSilent
  }

  silence(setSilent: boolean = true) {
    this.isSilent = setSilent
    return this
  }

  send(response?: string, options = defaultOptions) {
    if (this.isSilent)
      options.silence = true
    return sendMessagePayload(this, false, options, { content: response })
  }

  async getGuildMember(user: Maybe<UserLike> = this.getUser(), ignoreBots: boolean = false) {
    const guild = this.getGuild()
    if (!guild || !user)
      return undefined
    if (ignoreBots && user.bot)
      return undefined
    try {
      return await guild.members.fetch({ user })
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

  async send(response?: string, options = defaultOptions): MessageSend {
    const settings = this.settings
    const embed = this.embed

    this.embed.setColor(settings.style.colour)

    if (this.fields)
      this.embed.addFields(...this.fields)

    if (settings.label)
      this.embed.setFooter({ iconURL: settings.style.icon, text: `${settings.label.key}: ${settings.label.value}` })
    else
      this.embed.setFooter({ iconURL: settings.style.icon, text: `GU: ${this.getInitializer().guildId}` })

    if (this.getSilent())
      options.silence = true

    attachEmbed(this, response, '### ', '\n', options)
    return sendMessagePayload(this, !!settings.ephemeral, options, { embeds: [embed] })
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
    const component = this.getInitializer()
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

    attachEmbed(this, message, '### ', '\n\`-\` ', options)
    return await this.user.send({
      embeds: [embed],
      flags: options.flags,
      components: (this.actionRow && [this.actionRow]) || undefined,
    })
  }
}

export * as DiscordInteraction from '~/core/interactions'
