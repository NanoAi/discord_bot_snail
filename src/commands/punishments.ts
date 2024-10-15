import type { GuildMember, User } from 'discord.js'
import dayjs from '@utils/dayjs'
import { t as $t } from 'i18next'
import { CaseDBController } from '~/controllers/case'
import { UserDBController } from '~/controllers/user'
import { Command, CommandFactory, Factory } from '~/core/decorators'
import { Client, InteractionContextType as ICT } from '~/core/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/core/interactions'
import type { Args, DT } from '~/types/discord'

@Factory.setContexts(ICT.Guild)
@CommandFactory('softban', 'Ban then immediately unban a user.')
export class SoftBanCommand {
  @Command.addStringOption('reason', 'The reason for kicking the user.')
  @Command.addBooleanOption('kick', 'Tell the user they where kicked instead of banned.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['kick', boolean], ['reason', string]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild = reply.getGuild()!
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member || user === Client.user) {
      await reply.style(Styles.Error).send(`Could not find ${user} in the guild.`)
      return
    }

    if (!member.bannable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
      return
    }

    try {
      const directMessage = new DiscordInteraction.DirectMessage(ci)
      await directMessage
        .label(LK.ID, member.user.id)
        .style(Styles.Error)
        .to(member.user)
        .send($t(`you.${args.kick() ? 'kicked' : 'banned'}`))
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.noDM', { user: user.username }))
    }

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

@Factory.setContexts(ICT.Guild)
@CommandFactory('kick', 'Kick a user from the guild.')
export class KickCommand {
  @Command.addStringOption('reason', 'The reason for kicking the user.')
  @Command.addUserOption('user', 'The user to kick from the guild.')
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['reason', string]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member || user === Client.user) {
      await reply.style(Styles.Error).send($t('user.notFound', { user }))
      return
    }

    if (!member.kickable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`I could not kick ${member}.`)
      return
    }

    try {
      const dm = new DiscordInteraction.DirectMessage(ci)
      await dm.label(LK.ID, member.user.id).style(Styles.Error).to(member.user).send($t('you.kicked'))
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.noDM', { user: user.username }))
    }

    try {
      await member.kick(args.reason(undefined))
      await reply.label(LK.ID, member.user.id).style(Styles.Success).send(`${member} was kicked.`)
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.unknown', { cmd: 'kick' }))
    }
  }
}

@CommandFactory('ban', 'Ban a user from the guild.')
export class BanCommand {
  @Command.addStringOption('reason', 'The reason for banning the user.')
  @Command.addIntegerOption('duration', 'How long to ban the user for in days.')
  @Command.addUserOption('user', 'The user to ban from the server.')
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['duration', number], ['reason', string]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const user: User = args.user(undefined)
    const member: GuildMember | undefined = await reply.getGuildMember(user)

    if (!member || user === Client.user) {
      await reply.style(Styles.Error).send($t('user.notFound', { user }))
      return
    }

    if (!member.bannable) {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
      return
    }

    try {
      const dm = new DiscordInteraction.DirectMessage(ci)
      await dm.label(LK.ID, member.user.id).style(Styles.Error).to(member.user).send($t('you.banned'))
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.noDM', { user: user.username }))
    }

    try {
      await member.ban({ reason: args.reason(undefined), deleteMessageSeconds: 604800 })
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${member} was banned.`)
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send(`${$t('command.error.noBan')} ${member}.`)
    }
  }
}

@CommandFactory('warn', 'Warn a user for a reason.')
export class WarnCommand {
  @Command.addNumberOption('case', 'The case number to attach this warning to.')
  @Command.addStringOption('reason', 'The reason for warning the user.')
  @Command.addUserOption('user', 'The user to warn in the server.')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['user', User], ['reason', string], ['case', number]]>) {
    const timestamp = dayjs().unix()
    const reply = await new DiscordInteraction.Reply(ci).defer()
    const user = args.user(undefined)
    const reason = args.reason('unspecified').replaceAll('`', '')
    const member = (await reply.getGuildMember(user, true)) as GuildMember

    if (!member) {
      await reply.label(LK.ID, user.id).style(Styles.Error).send($t('user.noTarget', { user: user.username, id: user.id }))
      return
    }

    const userController = new UserDBController(member)
    const dbUser = await userController.getOrCreateUser()
    if (!dbUser)
      return

    const caseFile = await CaseDBController.upsertCase(args.case(0), member.guild.id, user.id, reason)
    CaseDBController.new({
      actionType: CaseDBController.ENUM.Action.WARN,
      timestamp: new Date(),
      userId: user.id,
      actorId: reply.getAuthor().id,
      reason,
    }, caseFile).upsertAction()

    const heatScore = dbUser.heat + 5
    userController.upsertUser({ heat: heatScore })

    try {
      const dm = new DiscordInteraction.DirectMessage(ci)
      const warnMessage = `
        [Case #\`${caseFile.id}\`] <:warn:1276566769867423848> User Warned [<t:${timestamp}:t>]
        \`\`\`${reason}\`\`\`
      `
      await dm.label(LK.ID, member.user.id)
        .style(Styles.Warn)
        .to(member.user)
        .send(warnMessage, { unwrap: true })
    }
    catch {
      await reply.label(LK.ID, member.user.id).style(Styles.Error).send($t('command.error.noDM', { user: user.username }))
    }

    const header = `Case: \`#${caseFile.id}\` | ${member}(\`${user.id}\`) was warned.`
    const output = `${header}\n\`\`\`\nReason: ${reason}\n\`\`\``
    await reply.label(LK.ID, member.user.id).style(Styles.Success).send(output)
  }
}
