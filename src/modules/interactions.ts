import type { ColorResolvable, GuildMember, InteractionReplyOptions, MessageReplyOptions, User } from 'discord.js'
import { EmbedBuilder } from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert } from './discord'
import * as Discord from './discord'

export function getChatInteraction(ci: ChatInteraction) {
  if (ci.interaction)
    return ci.interaction
  return ci.message!
}

export interface Colour { colour: ColorResolvable, icon: string }
export const Colours = {
  Info: { colour: 0x0099FF, icon: 'https://cdn.discordapp.com/emojis/1276562523746865182.webp?size=56&quality=lossless' },
  Success: { colour: 0x00FF66, icon: 'https://cdn.discordapp.com/emojis/1276565485735116852.webp?size=56&quality=lossless' },
  Error: { colour: 0xFF001A, icon: 'https://cdn.discordapp.com/emojis/1276565574821871616.webp?size=56&quality=lossless' },
  Warn: { colour: 0xFFE600, icon: 'https://cdn.discordapp.com/emojis/1276566769867423848.webp?size=56&quality=lossless' },
  Misc: { colour: 0x00233B, icon: 'https://cdn.discordapp.com/emojis/1276563326448570500.webp?size=56&quality=lossless' },
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
  style?: Colour
  user?: User | GuildMember
  ephemeral?: boolean
  s?: Colour
  u?: User | GuildMember
  e?: boolean
}

export async function reply(
  passthrough: ChatInteraction,
  response: string,
  settings: ReplySettings = {},
) {
  const ci = new CommandInteraction(passthrough)
  const interaction = ci.getInteraction()
  const message = ci.getMessage()!

  settings = {
    style: settings.style || settings.s || Colours.Misc,
    user: settings.user || settings.u,
    ephemeral: settings.ephemeral || settings.e,
  }

  const style = settings.style!
  const embed = new EmbedBuilder()
    .setColor(style.colour)
    .setDescription(`**${response}**`)
    .setTimestamp()

  if (settings.user)
    embed.setFooter({ iconURL: style.icon, text: `ID: ${settings.user.id}` })
  else
    embed.setFooter({ iconURL: style.icon, text: `GU: ${ci.getBoth().guildId}` })

  if (interaction) {
    if (interaction.replied)
      return

    response = response.replaceAll('%username%', interaction.user.username)
    const re = { embeds: [embed], fetchReply: true, ephemeral: !!settings.ephemeral }

    if (interaction.deferred) {
      await interaction.editReply(re)
    }
    else {
      await interaction.reply(re)
    }
  }
  else {
    response = response.replaceAll('%username%', message.author.username)
    await message.reply({ embeds: [embed] })
  }
}

export * as DiscordInteraction from '~/modules/interactions'
