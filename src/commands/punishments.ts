import type { GuildMember, User } from 'discord.js'
import dayjs from '@utils/dayjs'
import { t as $t } from 'i18next'
import NodeCache from 'node-cache'
import { CaseDBController } from '~/controllers/case'
import { UserDBController } from '~/controllers/user'
import { Command, CommandFactory, Factory, Options } from '~/core/decorators'
import { Client, CVar, InteractionContextType as ICT } from '~/core/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/core/interactions'
import type { CaseDB } from '~/types/controllers'
import type { Args, DT } from '~/types/discord'

const caseMem = new NodeCache({ stdTTL: 180, checkperiod: 120 })

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

    const authorId = reply.getAuthor().id
    const getCase = caseMem.get<CaseDB['select']>(authorId)
    const reason = args.reason(undefined)

    if (getCase) {
      const caseFile = await CaseDBController.upsertCase(getCase.id, member.guild.id, user.id, authorId, reason)
      CaseDBController.new({
        actionType: CaseDBController.ENUM.Action.SOFTBAN,
        timestamp: new Date(),
        userId: user.id,
        actorId: authorId,
        reason,
      }, caseFile).upsertAction()
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
      await member.ban({ reason, deleteMessageSeconds: 604800 })
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

    const authorId = reply.getAuthor().id
    const getCase = caseMem.get<CaseDB['select']>(authorId)
    const reason = args.reason(undefined)

    if (getCase) {
      const caseFile = await CaseDBController.upsertCase(getCase.id, member.guild.id, user.id, authorId, reason)
      CaseDBController.new({
        actionType: CaseDBController.ENUM.Action.KICK,
        timestamp: new Date(),
        userId: user.id,
        actorId: authorId,
        reason,
      }, caseFile).upsertAction()
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

    const authorId = reply.getAuthor().id
    const getCase = caseMem.get<CaseDB['select']>(authorId)
    const reason = args.reason(undefined)

    if (getCase) {
      const caseFile = await CaseDBController.upsertCase(getCase.id, member.guild.id, user.id, authorId, reason)
      CaseDBController.new({
        actionType: CaseDBController.ENUM.Action.BAN,
        timestamp: new Date(),
        userId: user.id,
        actorId: authorId,
        reason,
      }, caseFile).upsertAction()
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

function truncate(str: string, n: number) {
  return (str.length > n) ? `${str.slice(0, n - 1)}…` : str
}

@CommandFactory('case', 'Review case files.')
export class CaseCommand {
  @Options.number(number => number.setMinValue(0))
  @Command.addNumberOption('from', 'Starting from this Case ID.')
  @Command.addUserOption('user', 'The user to review the case files of.', [CVar.Required])
  @Command.addSubCommand('user', 'View cases by user.')
  public static async user(ci: DT.ChatInteraction, args: DT.Args<[['user', User], ['from', number]]>) {
    const reply = await new DiscordInteraction.Reply(ci).defer()
    const user = args.user(undefined)
    const from = Math.max(Number(args.from(0)), 0)
    const guild = reply.getGuild()
    const cases = await CaseDBController.getCasesByUser(user.id, from)

    if (!guild) {
      await reply.label(LK.ID, user.id).style(Styles.Error).send($t('command.error.noGuild'))
      return
    }

    const output = []
    if (cases) {
      let i = 5
      for (const v of cases) {
        if (v.guildId !== guild.id)
          continue
        if (i-- < 1)
          break

        const txt = [
          `⚖️ **.Actor:** <@${v.actorId}> (\`${v.actorId}\`)`,
          `🎯 **Target:** <@${v.userId}> (\`${v.userId}\`)`,
          `📝 **Reason ⸺**\n\`\`\`${truncate(v.description, 32)}\`\`\``,
        ]

        output.push({ name: `| 💼 Case #\`${v.id}\`\_`, value: txt.join('\n') })
      }
    }

    await reply.label(LK.GUILD, guild.id).style(Styles.Info).setFields(output).send()
  }

  @Command.addIntegerOption('case', 'The case ID to open.')
  @Command.addSubCommand('open', 'Open a case to append or edit.')
  public static async open(ci: DT.ChatInteraction, args: DT.Args<[['case', number]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const caseId = args.case(0)
    const caseFile = await CaseDBController.getCaseById(caseId) as CaseDB['select'] | undefined

    if (caseFile) {
      caseMem.set(reply.getAuthor().id, caseFile)
      let re = `Case File #\`${caseFile.id}\` opened for ${reply.getAuthor()} \`${reply.getAuthor().id}\`.`
      re = `${re}**\n⸺ Will close <t:${dayjs().add(3, 'minutes').unix()}:R>**.`
      await reply.style(Styles.Success).send(re)
    }
    else {
      await reply.style(Styles.Error).send('Case not found.')
    }
  }

  @Command.addSubCommand('close', 'Close a case that was being edited.')
  public static async close(ci: DT.ChatInteraction) {
    const reply = new DiscordInteraction.Reply(ci)
    const author = reply.getAuthor()
    const caseFile = caseMem.get(author.id) as CaseDB['select'] | undefined

    if (caseFile) {
      caseMem.del(author.id)
      await reply.send(`Case File #\`${caseFile.id}\` has been closed.`)
    }
    else {
      await reply.style(Styles.Error).send('Case not found. Try opening one first.')
    }
  }

  @Command.addStringOption('reason', 'The new case reason.')
  @Command.addSubCommand('update', 'Update case data.')
  public static async update(ci: DT.ChatInteraction, args: DT.Args<[['reason', string]]>) {
    const reply = await new DiscordInteraction.Reply(ci).defer()
    const guild = reply.getGuild()!
    const authorId = reply.getAuthor().id
    const caseFile = caseMem.get(authorId) as CaseDB['select'] | undefined

    if (!guild) {
      await reply.label(LK.ID, reply.getAuthor().id).style(Styles.Error).send($t('command.error.noGuild'))
      return
    }

    if (caseFile) {
      const update = await CaseDBController.updateCase(
        caseFile.id,
        guild.id,
        authorId,
        args.reason('undefined'),
      )

      if (!update) {
        await reply.style(Styles.Error).send('Failed to update the specified case file.')
        return
      }

      caseMem.set(authorId, update)
      await reply.style(Styles.Success).send(`Case File #\`${caseFile.id}\` updated.`)
    }
    else {
      await reply.style(Styles.Error).send('Case not found. Try opening one first.')
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
    const authorId = reply.getAuthor().id
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

    const caseFile = await CaseDBController.upsertCase(args.case(0), member.guild.id, user.id, authorId, reason)
    CaseDBController.new({
      actionType: CaseDBController.ENUM.Action.WARN,
      timestamp: new Date(),
      userId: user.id,
      actorId: authorId,
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
