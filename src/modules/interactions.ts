import type { ColorResolvable, InteractionReplyOptions, MessageReplyOptions, User } from 'discord.js'
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
  Info: { colour: 0x0099FF, icon: '📘' },
  Success: { colour: 0x00FF66, icon: '📗' },
  Error: { colour: 0xFF001A, icon: '📕' },
  Warn: { colour: 0xFFE600, icon: '📒' },
  Misc: { colour: 0x00233B, icon: '🐌' },
}

export class CommandInteraction {
  private lock: boolean = false
  private ci: ChatInteraction

  constructor(ci: ChatInteraction) {
    this.ci = ci
    return this
  }

  both() {
    const ci = this.ci
    return (ci.interaction || ci.message)!
  }

  get(target: 0 | 1) {
    const ci = this.ci
    return target === 0 && ci.interaction || ci.message
  }

  getGuild() {
    const ci = this.ci
    const guild = ci.interaction && ci.interaction.guild || ci.message && ci.message.guild || undefined
    return guild
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

export async function reply(ci: ChatInteraction, response: string, style: Colour = Colours.Misc, target?: User) {
  const embed = new EmbedBuilder()
    .setColor(style.colour)
    .setDescription(`<:snail:1276237038022033418> **${response}**`)
    .setTimestamp()

  if (target) {
    embed.setFooter({ text: `ID: ${target.id}` })
  }

  if (ci.interaction) {
    if (ci.interaction.replied)
      return

    response = response.replaceAll('%username%', ci.interaction.user.username)
    const interaction = ci.interaction
    const re = { embeds: [embed], fetchReply: true }

    if (interaction.deferred) {
      await interaction.editReply(re)
    }
    else {
      await interaction.reply(re)
    }
  }
  else {
    response = response.replaceAll('%username%', ci.message!.author.username)
    await ci.message!.reply({ embeds: [embed] })
  }
}

export * as DiscordInteraction from '~/modules/interactions'
