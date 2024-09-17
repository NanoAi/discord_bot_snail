import { BaseGuildTextChannel, type Channel, type GuildMember, type User } from 'discord.js'
import { t as $t, t } from 'i18next'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import type { Args, DT } from '~/types/discord'
import { UserDBController } from '~/controllers/user'
import { PFlags } from '~/modules/discord'

@Factory.setDMPermission(false)
@CommandFactory('bulk', 'Bulk commands for faster operations.')
export class BulkCommands {
  // TODO: Add string options.
  @Command.addStringOption('target', 'all | user | attachments')
  @Command.addChannelOption('channel', 'The channel to target.', { required: true })
  public static async delete(ci: DT.ChatInteraction, args: DT.Args<[['channel', Channel]]>) {
    let msg: string
    const reply = new DiscordInteraction.Reply(ci)
    const caller = reply.getUser()
    const channel = args.channel(undefined)

    if (!channel) {
      msg = $t('command.error.vars.notfound', { argument: 'channel' })
      reply.label(LK.ID, (caller && caller.id || '<unknown>')).style(Styles.Error)
        .ephemeral(true).send(msg)
      return
    }

    if (!channel.isTextBased() || !(channel instanceof BaseGuildTextChannel)) {
      msg = $t('command.error.vars.expected', { argument: 'channel', expected: 'text based guild channel' })
      reply.label(LK.ID, (caller && caller.id || '<unknown>')).style(Styles.Error)
        .ephemeral(true).send(msg)
      return
    }

    console.log('ok.')
    // channel.bulkDelete()
  }
}
