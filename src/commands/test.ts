import { Command, CommandFactory, Options } from '~/modules/decorators'
import * as Discord from '~/class/discord'

@CommandFactory('test', 'This is a test command.', [Discord.PFlags.BanMembers])
export class TestCommand {
  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  public static async main(inter: Discord.ChatInteraction) {
    const boolArg = inter.options.getBoolean('bool', false)
    const strArg = inter.options.getString('string', false)
    await inter.reply({ content: `Str: ${strArg}\nBool: ${boolArg}`, ephemeral: true })
  }
}

@CommandFactory('subcommands', 'Test subcommands.')
export class SubCommands {
  // This will be called every time any of the subcommands below are called.
  public static main(inter: Discord.ChatInteraction) {
    console.log(`The subcommands command was called by <${inter.user.username}>!`)
  }

  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Command.addSubCommand('one', '_one')
  public static async one(inter: Discord.ChatInteraction) {
    const strArg = inter.options.getBoolean('bool', false)
    await inter.reply(`One! ${strArg}`)
  }

  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  @Command.addSubCommand('two', '_two')
  public static async two(inter: Discord.ChatInteraction) {
    const strArg = inter.options.getString('string', false)
    await inter.reply(`Two! ${strArg}`)
  }

  @Command.addSubCommand('three', '_three')
  public static async three(inter: Discord.ChatInteraction) {
    await inter.reply('Three!')
  }
}

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  public static async main(inter: Discord.ChatInteraction) {
    await inter.reply({ content: 'Goodnight~', ephemeral: true })
    Discord.Client.destroy()
  }
}
