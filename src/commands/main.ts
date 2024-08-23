import { Colors, type GuildMember, type User, type UserResolvable } from 'discord.js'
import * as Discord from '@discord/discord'
import { Colours, DiscordInteraction } from '@discord/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  @Command.addBooleanOption('clear', 'Clear console commands before shutdown')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    await DiscordInteraction.reply(ci, `Goodnight~ %username%`)

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
@CommandFactory('kick', 'Kick a user from the guild.')
export class KickCommand {
  @Command.addStringOption('reason', 'The reason for kicking the user.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const guild = new DiscordInteraction.CommandInteraction(ci).getGuild()
    const user: any = args.user(undefined)
    if (!user)
      await DiscordInteraction.reply(ci, 'Failed to resolve the user provided.')
    if (guild) {
      try {
        const member = await guild.members.fetch({ user, force: true })
        // await member.kick(args.reason(undefined))
        await DiscordInteraction.reply(ci, `${member} was kicked from the guild.`, { s: Colours.Info, u: member.user })
      }
      catch {
        await DiscordInteraction.reply(ci, `Could not find ${user} in the guild.`, { s: Colours.Error })
      }
    }
  }
}

@Factory.setDMPermission(false)
@CommandFactory('leave', 'leave the current guild.')
export class LeaveCommand {
  // This should be defined as the base function to call.
  @Options.assertSlash()
  public static async main(ci: Discord.ChatInteraction) {
    const inter = ci.interaction!
    await DiscordInteraction.reply(ci, `Goodbye~ %username%`)
    inter.guild?.leave()
  }
}
