import type { GuildMember, User } from 'discord.js'
import { t as $t, t } from 'i18next'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import type { Args, DT } from '~/types/discord'
import { UserDBController } from '~/controllers/user'
import dayjs from '~/modules/utils/dayjs'
import { PFlags } from '~/modules/discord'

async function giveKudos(
  reply: DiscordInteraction.Reply,
  caller: GuildMember,
  target?: GuildMember,
  amount: number = 0,
  admin: boolean = false,
  ephemeral: boolean = false,
) {
  if (amount === 0) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Misc)
      .send('I uh... let\'s just pretend that worked.')
    return
  }

  if (!admin && caller === target) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error)
      .send('You can\'t give `kudos` to yourself.')
    return
  }

  if (!target) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error)
      .send(`I couldn't find ${target} in ${reply.getGuild()}.`)
    return
  }

  const dbCallForCaller = admin && undefined || new UserDBController(caller)
  const callerData = admin && undefined || await dbCallForCaller.getUser()

  if (!admin) {
    if (Math.abs(dayjs(callerData.createdAt).diff(callerData.lastKudosDate, 'd')) < 1) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error)
        .send('You must wait a day before you may give `kudos`, sorry.')
      return
    }
    if (dayjs().diff(callerData.lastKudosDate, 'd') < 1) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error)
        .send('You may only give `kudos` once a day, sorry.')
      return
    }
  }

  const dbCallForTarget = new UserDBController(target)
  const xp = { caller: callerData && callerData.xp, target: (await dbCallForTarget.getUser()).xp }
  const amountLeft = (xp.caller - amount)
  if (!admin && amountLeft < 0) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send('You don\'t have enough points to give.')
    return
  }

  try {
    await dbCallForTarget.updateUser({ xp: xp.target + amount })
    if (!admin)
      await dbCallForCaller.updateUser({ xp: amountLeft, lastKudosDate: new Date() })

    if (amount > 0) {
      await reply.label(LK.ID, caller.user.id).ephemeral(ephemeral).style(Styles.Success)
        .send(`${caller} has awarded ${amount} tokens to ${target}.`)
    }
    else {
      await reply.label(LK.ID, caller.user.id).ephemeral(ephemeral).style(Styles.Warn)
        .send(`${caller} has removed ${Math.abs(amount)} tokens from ${target}.`)
    }
  }
  catch {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send($t('command.error.unknown', { cmd: 'kudos' }))
  }
}

@Factory.setDMPermission(false)
@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('kudosop', 'Admin commands for the Kudos system.')
export class KudosAdmin {
  @Command.addBooleanOption('ephemeral', 'Should the response be hidden? (Slash Command Only.)')
  @Command.addIntegerOption('amount', 'How many points to give?', { required: true })
  @Command.addMentionableOption('user', 'Who to give kudos to?', { required: true })
  @Command.addSubCommand('add', 'Add Kudos to a user. (Use a negative to take.)')
  public static async addPoints(
    ci: DT.ChatInteraction,
    args: Args<[['user', User], ['amount', number], ['ephemeral', boolean]]>,
  ) {
    const reply = new DiscordInteraction.Reply(ci)
    if (!args.user()) {
      reply.style(Styles.Error).send('Please give me a user to target.')
      return
    }

    const caller = await reply.getGuildMember()
    const target = await reply.getGuildMember(args.user())
    giveKudos(reply, caller!, target, args.amount(0), true, args.ephemeral(false))
  }
}

@Factory.setDMPermission(false)
@CommandFactory('kudos', 'Give kudos to another user.')
export class KudosCommand {
  // This should be defined as the base function to call.
  @Options.number(c => c.setMinValue(1).setMaxValue(100))
  @Command.addIntegerOption('amount', 'How many points to give?', { required: true })
  @Command.addMentionableOption('user', 'Who to give kudos to?', { required: true })
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['amount', number]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const amount = Math.max(1, Math.min(args.amount(1), 100))
    if (!args.user()) {
      reply.style(Styles.Error).send('Please give me a user to target.')
      return
    }

    const caller = await reply.getGuildMember()
    const target = await reply.getGuildMember(args.user())
    giveKudos(reply, caller!, target, amount, false, false)
  }
}
