import { BaseGuildTextChannel, type Channel, type Message, type User } from 'discord.js'
import { t as $t, t } from 'i18next'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import type { DT } from '~/types/discord'
import { UserDBController } from '~/controllers/user'
import { InteractionContextType as ICT, PFlags } from '~/modules/discord'
import { logger } from '~/modules/utils/logger'

type bulkDeleteArgs = DT.Args<[
  ['channel', Channel],
  ['amount', number],
  ['target', User],
  ['attachments', boolean],
  ['around', string],
]>

@Factory.setContexts(ICT.Guild)
@CommandFactory('bulk', 'Bulk commands for faster operations.')
export class BulkCommands {
  @Command.addBooleanOption('attachments', 'Delete only attachments?')
  @Command.addUserOption('target', 'The target user to delete messages from.')
  @Command.addStringOption('around', 'Delete messages around the target message ID.')
  @Command.addIntegerOption('amount', 'How many messages to remove? (Up to 1000.)')
  @Command.addChannelOption('channel', 'The channel to target.', { required: true })
  @Command.addSubCommand('delete', 'Delete message in bulk on the server.')
  public static async delete(ci: DT.ChatInteraction, args: bulkDeleteArgs) {
    let msg: string

    const reply = new DiscordInteraction.Reply(ci)
    const caller = reply.getUser()
    const callerId = (caller && caller.id || '<unknown>')
    const channel = args.channel(undefined)
    const amount = Math.max(0, Math.min(Number(args.amount(1000)), 1000))
    const around = args.around(undefined)

    if (!channel) {
      msg = $t('command.error.vars.notfound', { argument: 'channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error)
        .ephemeral(true).send(msg)
      return
    }

    if (!channel.isTextBased() || !(channel instanceof BaseGuildTextChannel)) {
      msg = $t('command.error.vars.expected', { argument: 'channel', expected: 'text based guild channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error)
        .ephemeral(true).send(msg)
      return
    }

    const filters: { (message: Message<boolean>): boolean }[] = []
    if (args.target())
      filters.push((message: Message<boolean>) => message.author === args.target())

    if (args.attachments(false))
      filters.push((message: Message<boolean>) => message.attachments.size > 0)

    const filter = (message: Message<boolean>) => {
      for (const filter of filters) {
        if (!filter(message))
          return false
      }
      return true
    }

    const searchSettings = { limit: amount, cache: false, around }
    const msgCollection = (await channel.messages.fetch(searchSettings)).filter(filter)

    const deletedMessages = await channel.bulkDelete(msgCollection)
    await reply.label(LK.ID, callerId).style(Styles.Success)
      .ephemeral(true).send(`Deleted ${deletedMessages.size} Messages in ${channel}.`)
  }
}
