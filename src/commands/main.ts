import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import * as Discord from '~/modules/discord'

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  @Command.addBooleanOption('clear', 'Clear console commands before shutdown')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    await Discord.reply(ci, `Goodnight~ %username%`)

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

@Factory.noDM()
@CommandFactory('leave', 'leave the current guild.')
export class LeaveCommand {
  // This should be defined as the base function to call.
  @Options.assertSlash()
  public static async main(ci: Discord.ChatInteraction) {
    const inter = ci.interaction!
    await Discord.reply(ci, `Goodbye~ %username%`)
    inter.guild?.leave()
  }
}
