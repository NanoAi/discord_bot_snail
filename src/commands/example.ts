import * as Discord from '@discord/discord'
import { IntegrationType, InteractionContextType } from '@discord/discord'
import { DiscordInteraction } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'

@Factory.setDMPermission(false)
@CommandFactory('test', 'This is a test command.', [Discord.PFlags.BanMembers])
export class TestCommand {
  @Command.addMentionableOption('mention', 'select a user.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, `${args.mention()}`, { ephemeral: true })
  }
}

@Factory.setContexts(InteractionContextType.ALL)
@Factory.setIntegrations(IntegrationType.ALL)
@CommandFactory('send', 'Send a message.', [Discord.PFlags.SendMessages])
export class SendToServer {
  @Command.addStringOption('message', 'The message.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, args.message('No message provided...'))
  }
}

@CommandFactory('subcommands', 'Test subcommands.')
export class SubCommands {
  // This will be called every time any of the subcommands below are called.
  public static main(ci: Discord.ChatInteraction) {
    new DiscordInteraction.CommandInteraction(ci)
      .interaction(ci => console.log(`[CMD] The subcommands command was called by <${ci.user.username}>!`))
      .message(ci => console.log(`[CHAT] The subcommands command was called by <${ci.author.username}>!`))
  }

  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Command.addSubCommand('one', '_one')
  public static async one(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, `One! ${args.bool()}`)
  }

  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  @Command.addSubCommand('two', '_two')
  public static async two(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, `%username%: ${args.string('meow')}`)
  }

  @Command.addSubCommand('three', '_three')
  public static async three(ci: Discord.ChatInteraction) {
    await DiscordInteraction.acceptInteraction(ci)
  }

  @Options.defer()
  @Command.addSubCommand('defer', 'Testing defer...')
  public static async deferTest(ci: Discord.ChatInteraction) {
    setTimeout(async () => {
      await DiscordInteraction.reply(ci, 'meow')
    }, 1000)
  }

  @Command.addBooleanOption('bool', 'This is just a test.')
  @Command.addSubCommand('four', '_four')
  public static async randomName(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, `%username% is now ${args.bool(false)}`)
  }
}
