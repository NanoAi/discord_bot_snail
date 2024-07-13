import type { SlashCommandSubcommandBuilder } from 'discord.js'
import { CommandFactory, Mutators, Options } from '~/modules/decorators'
import * as Discord from '~/class/discord'

@CommandFactory('test', 'This is a test command.', [Discord.PFlags.BanMembers])
export class TestCommand {
  @Mutators.addBooleanOption('bool', 'Testing a boolean argument.')
  @Mutators.addStringOption('string', 'Testing a string argument.')
  @Options.string(settings => settings.setMinLength(3)) // <= WORKING
  public static async main(inter: Discord.ChatInteraction) {
    const boolArg = inter.options.getBoolean('bool', false)
    const strArg = inter.options.getString('string', false)
    await inter.reply({ content: `Str: ${strArg}\nBool: ${boolArg}`, ephemeral: true })
  }
}

const subCommands = {
  one: (obj: SlashCommandSubcommandBuilder) => {
    return obj.addBooleanOption((e) => {
      return e.setName('the_sadness').setDescription('I can\'t seem to figure it out...')
    })
  },
}

@CommandFactory('subcommands', 'Test subcommands.')
export class SubCommands {
  // This will be called every time any of the subcommands below are called.
  public static main(inter: Discord.ChatInteraction) {
    console.log(`The subcommands command was called by <${inter.user.username}>!`)
  }

  @Mutators.addSubCommand('one', '_one')
  @Options.subCommand(subCommands.one)
  public static async one(inter: Discord.ChatInteraction) {
    const strArg = inter.options.getBoolean('the_sadness', false)
    await inter.reply(`One! ${strArg}`)
  }

  @Mutators.addSubCommand('two', '_two')
  public static async two(inter: Discord.ChatInteraction) {
    await inter.reply('Two!')
  }

  @Mutators.addSubCommand('three', '_three')
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
