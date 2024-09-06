import type { GuildMember, User } from 'discord.js'
import { t as $t } from 'i18next'
import type * as Discord from '~/modules/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import { Command, CommandFactory, Factory } from '~/modules/decorators'

@Factory.setDMPermission(false)
@CommandFactory('softban', 'Ban then immediately unban a user.')
export class SoftBanCommand {
  @Command.addStringOption('reason', 'The reason for kicking the user.')
  @Command.addBooleanOption('kick', 'Tell the user they where kicked instead of banned.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild = reply.getGuild()!
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member) {
      await reply.style(Styles.Error).send(`Could not find ${user} in the guild.`)
      return
    }

    if (!member.bannable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
      return
    }

    // TODO: Send a message to the member here.
    try {
      await member.ban({ reason: args.reason(undefined), deleteMessageSeconds: 604800 })
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${member} was banned.`)
      await guild.bans.remove(member.user, 'softban')
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.unknown', { cmd: 'softban' }))
    }
  }
}

@Factory.setDMPermission(false)
@CommandFactory('kick', 'Kick a user from the guild.')
export class KickCommand {
  @Command.addStringOption('reason', 'The reason for kicking the user.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const reply = new DiscordInteraction.Reply(ci)
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member) {
      await reply.style(Styles.Error).send($t('user.notfound', { user }))
      return
    }

    if (!member.kickable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`I could not kick ${member}.`)
      return
    }

    // TODO: Send a message to the member here.
    try {
      await member.kick(args.reason(undefined))
      await reply.label(LK.ID, member.user.id).style(Styles.Success).send(`${member} was kicked.`)
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error)
        .send($t('command.error.unknown', { cmd: 'kick' }))
    }
  }
}

@CommandFactory('ban', 'Ban a user from the guild.')
export class BanCommand {
  @Command.addStringOption('reason', 'The reason for banning the user.')
  @Command.addIntegerOption('duration', 'How long to ban the user for in days.')
  @Command.addUserOption('user', 'The user to ban from the server.')
  public static async main(ci: Discord.ChatInteraction, args: any) {
    const reply = new DiscordInteraction.Reply(ci)
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member) {
      await reply.style(Styles.Error).send($t('user.notfound', { user }))
      return
    }

    if (!member.bannable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
      return
    }

    // TODO: Send a message to the member here.
    try {
      await member.ban({ reason: args.reason(undefined), deleteMessageSeconds: 604800 })
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${member} was banned.`)
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
    }
  }
}
