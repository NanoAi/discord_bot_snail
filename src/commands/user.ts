import type { GuildMember, User } from 'discord.js'
import { t as $t, t } from 'i18next'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/modules/interactions'
import { Command, CommandFactory, Factory, Options } from '~/modules/decorators'
import type { Args, DT } from '~/types/discord'
import { UserDBController } from '~/controllers/user'
import dayjs from '~/modules/utils/dayjs'

@Factory.setDMPermission(false)
@CommandFactory('kudos', 'Give kudos to another user.')
export class KudosCommand {
  // This should be defined as the base function to call.
  @Options.number(c => c.setMinValue(1).setMaxValue(100))
  @Command.addIntegerOption('amount', 'How many points to give?')
  @Command.addMentionableOption('user', 'Who to give kudos to?', { required: true })
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['amount', number]]>) {
    const amount = Math.max(1, Math.min(args.amount(1), 100))
    const reply = new DiscordInteraction.Reply(ci)

    const caller = (await reply.getGuildMember())!
    const target = await reply.getGuildMember(args.user())

    if (caller === target) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error)
        .send('You can\'t give `kudos` to yourself.')
      return
    }

    if (!target) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error)
        .send(`I couldn't find ${target} in ${reply.getGuild()}.`)
      return
    }

    const dbCallForCaller = new UserDBController(caller)
    const callerData = await dbCallForCaller.getUser()

    if (dayjs().diff(callerData.lastKudosDate, 'd') < 1) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error)
        .send('You may only give `kudos` once a day, sorry.')
      return
    }

    const dbCallForTarget = new UserDBController(target)
    const xp = { caller: callerData.xp, target: (await dbCallForTarget.getUser()).xp }
    const amountLeft = (xp.caller - amount)
    if (amountLeft < 0) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error).send('You don\'t have enough points to give.')
      return
    }

    try {
      await dbCallForTarget.updateUser({ xp: xp.target + amount })
      await dbCallForCaller.updateUser({ xp: amountLeft, lastKudosDate: new Date() })
      await reply.label(LK.ID, caller.user.id).ephemeral(false).send(`${caller} has awarded ${amount} tokens to ${target}.`)
    }
    catch {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error).send($t('command.error.unknown', { cmd: 'kudos' }))
    }
  }
}
