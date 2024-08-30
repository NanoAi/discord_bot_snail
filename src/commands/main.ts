import * as Discord from '@discord/discord'
import { DiscordInteraction } from '@discord/interactions'
import { MessageFlags } from 'discord.js'
import { GuildDBController } from '~/modules/controllers/guildController'
import { UserDBController } from '~/modules/controllers/userController'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import { logger } from '~/modules/utils/logger'

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  @Command.setValidator(isOP => isOP)
  @Command.addBooleanOption('clear', 'Clear console commands before shutdown')
  public static async main(ci: Discord.ChatInteraction, args: any) {
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
@CommandFactory('simulate', 'Simulates events for the database.')
export class SimulateCommand {
  @Command.setValidator(isOP => isOP)
  @Command.addMentionableOption('user', 'The user to target.')
  @Command.addSubCommand('user', 'Simulate a user joining the server.')
  public static async user(ci: Discord.ChatInteraction, args: any) {
    const re = new DiscordInteraction.Reply(ci)

    const guild = re.getGuild()
    const user = re.getUser()
    const member = await re.getGuildMember(user)

    if (!guild || !member) {
      await re.ephemeral(true)
        .send(`Could not find ${args.user()} in guild.`, { flags: MessageFlags.SuppressNotifications })
      return
    }

    await re.ephemeral(true)
      .send(`Simulating user join for ${args.user()}`, { flags: MessageFlags.SuppressNotifications })

    GuildDBController.where(guild.id).upsertGuild(true).catch(logger.catchError)
    UserDBController.where(guild.id, member.id).upsertUser().catch(logger.catchError)
  }

  @Command.addSubCommand('guild', 'Simulate the bot joining the current guild.')
  public static async guild(ci: Discord.ChatInteraction) {
    const re = new DiscordInteraction.Reply(ci)
    const guild = re.getGuild()

    if (!guild) {
      await re.ephemeral(true)
        .send(`Could not simulate a join to this guild.`)
      return
    }

    GuildDBController.where(guild.id).upsertGuild()
    await re.ephemeral(true).send(`Simulating guild join.`)
  }
}

@Factory.setDMPermission(false)
@CommandFactory('leave', 'leave the current guild.')
export class LeaveCommand {
  // This should be defined as the base function to call.
  @Options.assertSlash()
  public static async main(ci: Discord.ChatInteraction) {
    const reply = new DiscordInteraction.Reply(ci)
    await reply.send(`Goodbye~ %username%`)
    reply.getGuild()!.leave()
  }
}
