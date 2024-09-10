import type { Guild, GuildMember, User } from 'discord.js'
import { t as $t, use } from 'i18next'
import { MessageFlags } from 'discord.js'
import { GuildDBController } from '@controllers/guild'
import { UserDBController } from '@controllers/user'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import * as Discord from '~/modules/discord'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import { logger } from '~/modules/utils/logger'
import type { DT } from '~/types/discord'

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  @Command.setValidator(isOP => isOP)
  @Command.addBooleanOption('clear', 'Clear console commands before shutdown')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['clear', boolean]]>) {
    await new DiscordInteraction.Reply(ci).send(`Goodnight~ %username%`)

    const _G = Discord.Global
    const _R = Discord.Routes

    if (args.clear()) {
      _G.REST.put(
        _R.applicationGuildCommands(ci.interaction!.applicationId, ci.interaction!.guildId!),
        { body: [] },
      )
        .then(() => console.log('Successfully deleted all Guild commands.'))
        .catch(console.error)

      _G.REST.put(
        _R.applicationCommands(ci.interaction!.applicationId),
        { body: [] },
      )
        .then(() => console.log('Successfully deleted all Application commands.'))
        .catch(console.error)
    }

    Discord.shutdown()
  }
}

@Factory.setDMPermission(false)
@CommandFactory('dm', 'Send a Direct Message to a server member.')
export class SendDM {
  @Command.setValidator(isOP => isOP)
  @Command.addStringOption('message', 'The message to send.')
  @Command.addMentionableOption('user', 'The user to target.')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['user', User], ['message', string]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild: Guild = reply.getGuild()!
    const user: User = args.user()

    try {
      const dm = new DiscordInteraction.DirectMessage(ci)
      await dm.label(LK.GUILD, guild.id).style(Styles.Info).to(user).send(args.message())
      await reply.ephemeral(true).send(`Sent a DM to ${user}`)
    }
    catch {
      await reply.label(LK.ID, user.id).style(Styles.Error)
        .send($t('command.error.noDM', { user: user.username }))
    }
  }
}

@Factory.setDMPermission(false)
@CommandFactory('simulate', 'Simulates events for the database.')
export class SimulateCommand {
  @Command.setValidator(isOP => isOP)
  @Command.addMentionableOption('user', 'The user to target.')
  @Command.addSubCommand('user', 'Simulate a user joining the server.')
  public static async user(ci: DT.ChatInteraction, args: DT.Args<[['user', User]]>) {
    const re = new DiscordInteraction.Reply(ci)

    const guild = re.getGuild()
    const user: User = args.user()
    const member = await re.getGuildMember(user)

    if (!user || !guild || !member) {
      await re.ephemeral(true)
        .send(`Could not find ${user} in guild.`, { flags: MessageFlags.SuppressNotifications })
      return
    }

    await re.ephemeral(true)
      .send(`Simulating user join for ${user}`, { flags: MessageFlags.SuppressNotifications })

    GuildDBController.instance(guild).upsertGuild().catch(logger.catchError)
    UserDBController.instance(member).upsertUser().catch(logger.catchError)
  }

  @Command.setValidator(isOP => isOP)
  @Command.addSubCommand('guild', 'Simulate the bot joining the current guild.')
  public static async guild(ci: DT.ChatInteraction) {
    const re = new DiscordInteraction.Reply(ci)
    const guild = re.getGuild()

    if (!guild) {
      await re.ephemeral(true)
        .send(`Could not simulate a join to this guild.`)
      return
    }

    GuildDBController.instance(guild).upsertGuild()
    await re.ephemeral(true).send(`Simulating guild join.`)
  }
}

@Factory.setDMPermission(false)
@CommandFactory('leave', 'leave the current guild.')
export class LeaveCommand {
  // This should be defined as the base function to call.
  @Options.assertSlash()
  public static async main(ci: DT.ChatInteraction) {
    const reply = new DiscordInteraction.Reply(ci)
    await reply.send(`Goodbye~ %username%`)
    reply.getGuild()!.leave()
  }
}
