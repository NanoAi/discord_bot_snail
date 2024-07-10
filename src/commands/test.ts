import { SlashCommand, Mutators } from '~/modules/decorators'
import { DiscordClient } from '~/class/discord'

@SlashCommand('test', 'This is a test command.')
export class TestCommand {
  // This should be defined as the base function to call.
  public static main() {
    console.log('hello world, this is "test.ts"')
  }

  // This can be a subcommand definition, maybe as DefineSubCommand.
  public static other() {
    console.log('This is a subcommand.')
  }

  // This actually only needs the mutator to get added.
  // It gets added to the top level "SlashCommand".
  @Mutators.addBooleanOption('can', 'Can five do it?')
  public static another() {
    console.log('Another one...')
  }
}

@SlashCommand('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  public static main() {
    DiscordClient.destroy()
  }
}
