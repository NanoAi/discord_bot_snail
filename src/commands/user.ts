import type { GuildMember, User } from 'discord.js'
import type { Args, DT } from '~/types/discord'
import { t as $t } from 'i18next'
import { UserDBController } from '~/controllers/user'
import { Command, CommandFactory, Factory, Options } from '~/core/decorators'
import { awaitedUserCache, CVar, ICT, AIT, PFlags } from '~/core/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/core/interactions'
import dayjs from '~/core/utils/dayjs'
import { xpToLevel } from '~/core/utils/levels'
import NodeCache from 'node-cache'
import { logger } from '~/core/utils/logger'
import { SystemCache } from '~/core/cache'

const userCache = new NodeCache({ stdTTL: 180, checkperiod: 120 })

async function giveKudos(
  reply: DiscordInteraction.Reply,
  caller: GuildMember,
  target?: GuildMember,
  amount: number = 0,
  admin: boolean = false,
  ephemeral: boolean = false,
) {
  amount = Math.round(Math.max(-3000, Math.min(Number(amount), 3000)))

  if (amount === 0) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Misc).send('I uh... let\'s just pretend that worked.')
    return
  }

  if (!admin && caller === target) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send('You can\'t give `kudos` to yourself.')
    return
  }

  if (!target) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send(`I couldn't find ${target} in ${reply.getGuild()}.`)
    return
  }

  const dbCallForCaller = (admin && undefined) || new UserDBController(caller)
  const callerData = (admin && undefined) || await dbCallForCaller.getOrCreateUser()

  if (!callerData) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send($t('command.error.database'))
    return
  }

  if (!admin) {
    if (Math.abs(dayjs(callerData.createdAt).diff(callerData.lastKudosDate, 'd')) < 1) {
      await reply
        .label(LK.ID, caller.user.id)
        .style(Styles.Error)
        .send('You must wait a day before you may give `kudos`, sorry.')
      return
    }
    if (dayjs().diff(callerData.lastKudosDate, 'd') < 1) {
      await reply.label(LK.ID, caller.user.id).style(Styles.Error).send('You may only give `kudos` once a day, sorry.')
      return
    }
  }

  const dbCallForTarget = new UserDBController(target)
  const dbTargetUser = await dbCallForTarget.getOrCreateUser()

  if (!dbTargetUser) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send($t('command.error.database'))
    return
  }

  const xp = { caller: callerData && callerData.xp, target: dbTargetUser.xp }
  const amountLeft = (xp.caller - amount)
  const amountToSet = Math.max(-3000, Math.min((xp.target + amount), 3000))
  const targetLevel = Math.max(dbTargetUser.level, xpToLevel(amountToSet))

  if (!admin && amountLeft < 0) {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send('You don\'t have enough points to give.')
    return
  }

  try {
    await dbCallForTarget.updateUser({ xp: amountToSet, level: targetLevel })
    if (!admin)
      await dbCallForCaller.updateUser({ xp: amountLeft, lastKudosDate: new Date() })

    if (amount > 0) {
      await reply
        .label(LK.ID, caller.user.id)
        .ephemeral(ephemeral)
        .style(Styles.Success)
        .silence(true)
        .send(`${caller} has awarded ${amount} tokens to ${target}.`)
    }
    else {
      await reply
        .label(LK.ID, caller.user.id)
        .ephemeral(ephemeral)
        .style(Styles.Warn)
        .silence(true)
        .send(`${caller} has removed ${Math.abs(amount)} tokens from ${target}.`)
    }
  }
  catch {
    await reply.label(LK.ID, caller.user.id).style(Styles.Error).send($t('command.error.unknown', { cmd: 'kudos' }))
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setIntegrations([AIT.GuildInstall])
@Factory.setPermissions([PFlags.Administrator])
@CommandFactory('kudosop', 'Admin commands for the Kudos system.')
export class KudosAdmin {
  @Command.addBooleanOption('ephemeral', 'Should the response be hidden? (Slash Command Only.)')
  @Command.addIntegerOption('amount', 'How many points to give?', [CVar.Required])
  @Command.addMentionableOption('user', 'Who to give kudos to?', [CVar.Required])
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

    if (args.amount() > 999999 || args.amount() < -999999) {
      reply.style(Styles.Error).setTitle('`[Never Knows Best]]`').send('Overflow Detected.')
      return
    }

    if (reply.isBotInteraction(args.user()))
      return

    const caller = await reply.getGuildMember()
    const target = await reply.getGuildMember(args.user())
    giveKudos(reply, caller!, target, args.amount(0), true, args.ephemeral(false))
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setIntegrations([AIT.GuildInstall])
@CommandFactory('vouch', 'Vouch for another user!')
export class VouchCommand {
  @Command.addStringOption('id', 'The User ID to vouch for.')
  @Command.addStringOption('name', 'Optionally set the users name.')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['id', string], ['name', string]]>) {
    const reply = new DiscordInteraction.Reply(ci).ephemeral(true)
    const caller = (await reply.getGuildMember())!

    const guild = caller.guild
    const target = await guild.members.fetch(args.id())

    if (!target) {
      const user = awaitedUserCache.addAwaitedUser(caller.guild, args.id())
      if (!user) {
        reply.style(Styles.Error).send($t('user.notFound'))
        return
      }
      reply.style(Styles.Success).send($t('vouch.onJoin'))
      return
    }

    const guildSettings = SystemCache.global().getGuildSettings(guild.id)
    guildSettings.then(async (settings) => {
      if (!settings) {
        reply.style(Styles.Error).send($t('command.error.noGuild'))
        return
      }

      if (!target || !target.roles) {
        reply.style(Styles.Error).send('Role Manager Error.')
        return
      }

      if (!settings.vouch.from) {
        reply.style(Styles.Error).send($t('vouch.noRole'))
        return
      }

      const role = await guild.roles.fetch(settings.vouch.to)
      if (!role) {
        reply.style(Styles.Error).send($t('vouch.roleNotFound'))
        return
      }

      if (target.roles.cache.has(role.id)) {
        reply.style(Styles.Warn).send($t('vouch.has'))
        return
      }

      if (args.name()) {
        target.setNickname(args.name(), 'VOUCH')
      }

      target.roles.add(role, `VOUCH: ${caller.id}`)

      if(settings.vouch.remove) {
        const roleToRemove = await guild.roles.fetch(settings.vouch.remove)
        if (roleToRemove) {
          target.roles.remove(roleToRemove)
        }
      }

      logger.chatLog(
        guild,
        `[VOUCH] <@${caller.id}> vouched for <@${target.id}>.`,
        `@ ${caller.id} vouches for ${target.id}!`
      )
      reply.style(Styles.Success).send($t('vouch.vouch', {user: target.id}))
    })
    // Add Voucher database so that we can track who the user vouched for.
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setIntegrations([AIT.GuildInstall])
@CommandFactory('kudos', 'Give kudos to another user.')
export class KudosCommand {
  // This should be defined as the base function to call.
  @Options.number(c => c.setMinValue(1).setMaxValue(100))
  @Command.addIntegerOption('amount', 'How many points to give?', [CVar.Required])
  @Command.addMentionableOption('user', 'Who to give kudos to?', [CVar.Required])
  public static async main(ci: DT.ChatInteraction, args: Args<[['user', User], ['amount', number]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const amount = Math.max(1, Math.min(args.amount(1), 100))
    if (!args.user()) {
      reply.style(Styles.Error).send('Please give me a user to target.')
      return
    }

    if (reply.isBotInteraction(args.user()))
      return

    const caller = await reply.getGuildMember()
    const target = await reply.getGuildMember(args.user(), true)
    giveKudos(reply, caller!, target, amount, false, false)
  }
}
