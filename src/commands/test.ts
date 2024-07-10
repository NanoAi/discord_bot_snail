import { SlashCommand, Mutators } from '~/modules/decorators'
import { DiscordChatInteraction, DiscordClient } from '~/class/discord'

@SlashCommand('test', 'This is a test command.')
export class TestCommand {
  // This should be defined as the base function to call.
  public static async main(inter: DiscordChatInteraction) {
    console.log('hello world, this is "test.ts"')
    await inter.reply({ content: 'Hello World!', ephemeral: true })
  }

  // This can be a subcommand definition, maybe as DefineSubCommand.
  public static other() {
    console.log('This is a subcommand.')
  }

  // This actually only needs the mutator to get added.
  // It gets added to the top level "SlashCommand".

  // FIX: Currently the modifier gets called even if it's not passed.
  @Mutators.addBooleanOption('can', 'Can five do it?')
  public static async boolTest(inter: DiscordChatInteraction) {
    // TODO: Figure out how to retrieve the users response to this option.
    console.log('This command takes a specific value.')
    await inter.reply({ content: 'This is a boolean modifier.', ephemeral: true })
  }
}

@SlashCommand('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  public static async main(inter: DiscordChatInteraction) {
    await inter.reply({ content: 'Goodnight~', ephemeral: true })
    DiscordClient.destroy()
  }
}
