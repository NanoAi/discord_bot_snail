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
  @Command.addBooleanOption('softban', 'This will ban then unban the user.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const _ci = new DiscordInteraction.CommandInteraction(ci)
    const guild = _ci.getGuild()!
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await _ci.getGuildMember(user)
    const softban: boolean = args.softban(false)

    if (!member) {
      await DiscordInteraction.reply(ci, `Could not find ${user} in the guild.`, { s: Colours.Error })
      return
    }

    if (!member.kickable) {
      await DiscordInteraction.reply(ci, `I could not kick ${member}.`, { s: Colours.Error, u: member.user })
      return
    }

    if (softban && !member.bannable) {
      await DiscordInteraction.reply(ci, `I could not softban ${member}.`, { s: Colours.Error, u: member.user })
      return
    }

    // TODO: Send a message to the member here.

    if (softban) {
      await member.ban({ reason: 'softban', deleteMessageSeconds: 604800 })
      await guild.bans.remove(member.user, 'softban')
    }
    else {
      await member.kick(args.reason(undefined))
    }

    await DiscordInteraction.reply(ci, `${member} was kicked from the guild.`, { s: Colours.Info, u: member.user })
  }
}

@CommandFactory('ban', 'Ban a user from the guild.')
export class BanCommand {
  @Command.addStringOption('reason', 'The reason for banning the user.')
  @Command.addIntegerOption('duration', 'How long to ban the user for in days.')
  @Command.addBooleanOption('softban', 'Unban the user instantly.')
  @Command.addUserOption('user', 'The user to ban from the server.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const _ci = new DiscordInteraction.CommandInteraction(ci)
    const guild = _ci.getGuild()!
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await _ci.getGuildMember(user)
    const softban: boolean = args.softban(false)

    if (!member) {
      await DiscordInteraction.reply(ci, `Could not find ${user} in the guild.`, { s: Colours.Error })
      return
    }

    if (!member.bannable) {
      await DiscordInteraction.reply(ci, `I could not ban ${member}.`, { s: Colours.Error, u: member.user })
      return
    }

    // TODO: Send a message to the member here.
    await member.ban({ reason: args.reason(undefined), deleteMessageSeconds: 604800 })
    await DiscordInteraction.reply(ci, `${member} was banned from the guild.`, { s: Colours.Info, u: member.user })
    if (softban)
      await guild.bans.remove(member.user, 'softban')
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
