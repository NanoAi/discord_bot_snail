import { Command, CommandFactory, Options } from '~/modules/decorators'
import * as Discord from '~/class/discord'

@Options.strict
@CommandFactory('test', 'This is a test command.', [Discord.PFlags.BanMembers])
export class TestCommand {
  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    await Discord.reply(ci, `Str: ${args.string()}\nBool: ${args.bool()}`, { ephemeral: true })
  }
}

@CommandFactory('subcommands', 'Test subcommands.')
export class SubCommands {
  // This will be called every time any of the subcommands below are called.
  public static main(ci: Discord.ChatInteraction) {
    new Discord.CommandInteraction(ci)
      .interaction(ci => console.log(`[CMD] The subcommands command was called by <${ci.user.username}>!`))
      .message(ci => console.log(`[CHAT] The subcommands command was called by <${ci.author.username}>!`))
  }

  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Command.addSubCommand('one', '_one')
  public static async one(ci: Discord.ChatInteraction, args: any) {
    await Discord.reply(ci, `One! ${args.bool()}`)
  }

  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  @Command.addSubCommand('two', '_two')
  public static async two(ci: Discord.ChatInteraction, args: any) {
    await Discord.reply(ci, `%username%: ${args.string('meow')}`)
  }

  @Command.addSubCommand('three', '_three')
  public static async three(ci: Discord.ChatInteraction) {
    await Discord.acceptInteraction(ci)
  }

  @Command.addBooleanOption('bool', 'This is just a test.')
  @Command.addSubCommand('four', '_four')
  public static async randomName(ci: Discord.ChatInteraction, args: any) {
    await Discord.reply(ci, `%username% is now ${args.bool(false)}`)
  }
}

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  public static async main(ci: Discord.ChatInteraction) {
    await Discord.reply(ci, `Goodnight~ %username%`)
    Discord.Client.destroy()
  }
}
