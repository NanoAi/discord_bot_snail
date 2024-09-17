import * as Discord from '~/modules/discord'
import { IntegrationType, InteractionContextType, PFlags } from '~/modules/discord'
import { DiscordInteraction } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import type { DT } from '~/types/discord'

@Factory.setDMPermission(false)
@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('test', 'This is a test command.')
export class TestCommand {
  @Command.addMentionableOption('mention', 'select a user.')
  public static async main(ci: DT.ChatInteraction, args: any) {
    await new DiscordInteraction.Reply(ci).ephemeral(true).send(`${args.mention()}`)
  }
}

@Factory.setContexts(InteractionContextType.ALL)
@Factory.setIntegrations(IntegrationType.ALL)
@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('send', 'Send a message.')
export class SendToServer {
  @Command.addStringOption('message', 'The message.')
  public static async main(ci: DT.ChatInteraction, args: any) {
    await new DiscordInteraction.Reply(ci).send(args.message('No message provided...'))
  }
}

@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('subcommands', 'Test subcommands.')
export class SubCommands {
  // This will be called every time any of the subcommands below are called.
  public static main(ci: DT.ChatInteraction) {
    new DiscordInteraction.CommandInteraction(ci)
      .callback()
      .interaction(ci => console.log(`[CMD] The subcommands command was called by <${ci.user.username}>!`))
      .message(ci => console.log(`[CHAT] The subcommands command was called by <${ci.author.username}>!`))
  }

  @Command.addBooleanOption('bool', 'Testing a boolean argument.')
  @Command.addSubCommand('one', '_one')
  public static async one(ci: DT.ChatInteraction, args: any) {
    await new DiscordInteraction.Reply(ci).send(`One! ${args.bool()}`)
  }

  @Options.string(settings => settings.setMinLength(3))
  @Command.addStringOption('string', 'Testing a string argument.')
  @Command.addSubCommand('two', '_two')
  public static async two(ci: DT.ChatInteraction, args: any) {
    await new DiscordInteraction.Reply(ci).send(`%username%: ${args.string('meow')}`)
  }

  @Command.addSubCommand('three', '_three')
  public static async three(ci: DT.ChatInteraction) {
    await DiscordInteraction.acceptInteraction(ci)
  }

  @Options.defer()
  @Command.addSubCommand('defer', 'Testing defer...')
  public static async deferTest(ci: DT.ChatInteraction) {
    setTimeout(async () => {
      await new DiscordInteraction.Reply(ci).send('meow')
    }, 1000)
  }

  @Command.addBooleanOption('bool', 'This is just a test.')
  @Command.addSubCommand('four', '_four')
  public static async randomName(ci: DT.ChatInteraction, args: any) {
    await new DiscordInteraction.Reply(ci).send(`%username% is now ${args.bool(false)}`)
  }
}
