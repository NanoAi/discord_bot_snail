import { BaseGuildTextChannel, type Channel, ForumChannel, type GuildMember, type Message, type User } from 'discord.js'
import { t as $t } from 'i18next'
import { ForumController } from '~/controllers/forum'
import { Command, CommandFactory, Factory, Options } from '~/core/decorators'
import { CVar, InteractionContextType as ICT, PFlags } from '~/core/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/core/interactions'
import type { DT } from '~/types/discord'

type bulkDeleteArgs = DT.Args<[
  ['channel', Channel],
  ['amount', number],
  ['target', User],
  ['attachments', boolean],
  ['around', string],
]>

@Factory.setContexts(ICT.Guild)
@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('bulk', 'Bulk commands for faster operations.')
export class BulkCommands {
  @Command.addBooleanOption('attachments', 'Delete only attachments?')
  @Command.addUserOption('target', 'The target user to delete messages from.')
  @Command.addStringOption('around', 'Delete messages around the target message ID.')
  @Command.addIntegerOption('amount', 'How many messages to remove? (Up to 1000.)')
  @Command.addChannelOption('channel', 'The channel to target.', [CVar.Required])
  @Command.addSubCommand('delete', 'Delete message in bulk on the server.')
  public static async delete(ci: DT.ChatInteraction, args: bulkDeleteArgs) {
    let msg: string

    const reply = new DiscordInteraction.Reply(ci)
    const caller = reply.getUser()
    const callerId = (caller && caller.id) || '<unknown>'
    const channel = args.channel(undefined)
    const amount = Math.max(0, Math.min(Number(args.amount(1000)), 1000))
    const around = args.around(undefined)

    if (!channel) {
      msg = $t('command.error.vars.notfound', { argument: 'channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error).ephemeral(true).send(msg)
      return
    }

    if (!channel.isTextBased() || !(channel instanceof BaseGuildTextChannel)) {
      msg = $t('command.error.vars.expected', { argument: 'channel', expected: 'text based guild channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error).ephemeral(true).send(msg)
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
    await reply
      .label(LK.ID, callerId)
      .style(Styles.Success)
      .ephemeral(true)
      .send(`Deleted ${deletedMessages.size} Messages in ${channel}.`)
  }
}

type ThreadCommandArgs = DT.Args<[
  ['channel', Channel],
  ['bumps', number],
  ['managed', boolean],
]>

@Factory.setContexts(ICT.Guild)
@CommandFactory('thread', 'Setup thread controller for a target thread.')
export class ThreadCommand {
  @Command.addBooleanOption('managed', 'Managed threads/answers.')
  @Options.number(config => config.setMinValue(0))
  @Command.addIntegerOption('bumps', 'The amount of time to timeout for bumping. (0 to disable.)')
  @Command.addChannelOption('channel', 'The channel to target.', [CVar.Required])
  @Command.addSubCommand('bind', 'make the bot control a forum.')
  public static async setup(ci: DT.ChatInteraction, args: ThreadCommandArgs) {
    const reply = new DiscordInteraction.Reply(ci)
    const caller = reply.getUser()
    const callerId = (caller && caller.id) || '<unknown>'
    const forum = args.channel()
    const member: GuildMember | undefined = await reply.getGuildMember(caller)

    if (member && !member.permissions.has(PFlags.KickMembers, true)) {
      await reply
        .label(LK.ID, callerId)
        .style(Styles.Error)
        .ephemeral(true)
        .send($t('command.error.permissions', { cmd: 'thread bind' }))
      return
    }

    if (!(forum instanceof ForumChannel)) {
      const msg = $t('command.error.vars.expected', { argument: 'channel', expected: 'a forum channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error).ephemeral(true).send(msg)
      return
    }

    const controller = new ForumController()
    await controller.upsertForum({
      forumId: forum.id,
      guildId: reply.getGuild()!.id,
      managed: args.managed(false),
      bump: args.bumps(300),
    })

    await reply.label(LK.ID, callerId).style(Styles.Success).ephemeral(true).send(`Thread Settings Created for ${forum}.`)
  }

  @Command.addChannelOption('channel', 'The channel to target.', [CVar.Required])
  @Command.addSubCommand('unbind', 'remove the bots binding to a forum.')
  public static async remove(ci: DT.ChatInteraction, args: DT.Args<[['channel', Channel]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const caller = reply.getUser()
    const callerId = (caller && caller.id) || '<unknown>'
    const forum = args.channel()
    const member: GuildMember | undefined = await reply.getGuildMember(caller)

    if (member && !member.permissions.has(PFlags.KickMembers, true)) {
      await reply
        .label(LK.ID, callerId)
        .style(Styles.Error)
        .ephemeral(true)
        .send($t('command.error.permissions', { cmd: 'thread unbind' }))
      return
    }

    if (!(forum instanceof ForumChannel)) {
      const msg = $t('command.error.vars.expected', { argument: 'channel', expected: 'a forum channel' })
      await reply.label(LK.ID, callerId).style(Styles.Error).ephemeral(true).send(msg)
      return
    }

    const controller = new ForumController()
    await controller.deleteForum(forum.id)

    await reply.label(LK.ID, callerId).style(Styles.Success).ephemeral(true).send(`Thread Settings Deleted for ${forum}.`)
  }
}
