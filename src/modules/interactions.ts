import type { InteractionReplyOptions, MessageReplyOptions } from 'discord.js'
import { EmbedBuilder } from 'discord.js'
import type { ChatInteraction, ChatInteractionAssert } from './discord'
import * as Discord from './discord'

export function getChatInteraction(ci: ChatInteraction) {
  if (ci.interaction)
    return ci.interaction
  return ci.message!
}

export enum Colours {
  Info = 0x0099FF,
  Success = 0x00FF66,
  Error = 0xFF001A,
  Warn = 0xFFE600,
  Misc = 0x00233B,
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

export async function reply(ci: ChatInteraction, response: string, options?: InteractionReplyOptions | MessageReplyOptions) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setDescription(`📘 **${response}**`)

  if (ci.interaction) {
    if (ci.interaction.replied)
      return

    response = response.replaceAll('%username%', ci.interaction.user.username)
    const interaction = ci.interaction
    const _options = options as InteractionReplyOptions

    if (_options) {
      _options.fetchReply = true
    }

    const re = { embeds: [embed], ...(_options || {}) }

    if (interaction.deferred) {
      await interaction.editReply(re)
    }
    else {
      await interaction.reply(re)
    }
  }
  else {
    response = response.replaceAll('%username%', ci.message!.author.username)
    await ci.message!.reply({ embeds: [embed], ...((options as MessageReplyOptions) || {}) })
  }
}

export * as DiscordInteraction from '~/modules/interactions'
