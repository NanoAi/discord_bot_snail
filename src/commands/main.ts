import * as Discord from '@discord/discord'
import { DiscordInteraction } from '@discord/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'

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
