import type { Guild, User } from 'discord.js'
import process from 'node:process'
import { msCompare } from '@utils/dayjs'
import { MessageFlags } from 'discord.js'
import { t as $t } from 'i18next'
import { GuildDBController } from '~/controllers/guild'
import { UserDBController } from '~/controllers/user'
import { SystemCache } from '~/core/cache'
import { Command, CommandFactory, Factory, Options } from '~/core/decorators'
import * as Discord from '~/core/discord'
import { CVar, InteractionContextType as ICT } from '~/core/discord'
import { DiscordInteraction, LabelKeys as LK, Styles } from '~/core/interactions'
import { logger } from '~/core/utils/logger'
import type { DT } from '~/types/discord'

@CommandFactory('shutdown', 'shutdown the bot.')
export class ShutdownCommand {
  // This should be defined as the base function to call.
  @Command.setValidator(isOP => isOP)
  @Command.addBooleanOption('clear', 'Clear console commands before shutdown')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['clear', boolean]]>) {
    await new DiscordInteraction.Reply(ci).send(`Goodnight~ %username%`)

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

@Factory.setContexts(ICT.Guild)
@Factory.setPermissions([Discord.PFlags.Administrator])
@CommandFactory('flush', 'Flush the guilds cache settings. (Updates Settings.)')
export class FlushCommand {
  @Command.addSubCommand('permissions', 'Flush the permissions cache.')
  public static async permissions(ci: DT.ChatInteraction) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild = reply.getGuild()!
    SystemCache.global().getGuildPermissions().del(guild.id)

    const safeName = (guild.name.match(/[\w!@#$%^&*()[/\\\]]+/g) || []).join('')
    await reply.label(LK.GUILD, guild.id).style(Styles.Success).send(`Cleared Permissions Cache for "\`${safeName}\`".`)
  }

  @Command.addSubCommand('forums', 'Flush the forums cache.')
  public static async forums(ci: DT.ChatInteraction) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild = reply.getGuild()!
    SystemCache.global().getGuildForums().del(guild.id)

    const safeName = (guild.name.match(/[\w!@#$%^&*()[/\\\]]+/g) || []).join('')
    await reply.label(LK.GUILD, guild.id).style(Styles.Success).send(`Cleared Permissions Cache for "\`${safeName}\`".`)
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setPermissions([Discord.PFlags.KickMembers])
@CommandFactory('msg', 'Send a Direct Message to a server member.')
export class SendDM {
  @Command.addStringOption('message', 'The message to send.', [CVar.TakeRest])
  @Command.addUserOption('user', 'The user to target.')
  public static async main(ci: DT.ChatInteraction, args: DT.Args<[['user', User], ['message', string]]>) {
    const reply = new DiscordInteraction.Reply(ci)
    const guild: Guild = reply.getGuild()!
    const user: User = args.user()

    if (user === Discord.Client.user) {
      const msg = reply.label(LK.ID, user.id).style(Styles.Error).ephemeral(true)
      await msg.send($t('command.error.noDM', { user: user.username }))
      return
    }

    try {
      const dm = new DiscordInteraction.DirectMessage(ci)
      await dm.label(LK.GUILD, guild.id).style(Styles.Info).to(user).send(args.message())
      await reply.ephemeral(true).setTitle(`Sent a DM to ${user}`).send(args.message())
    }
    catch (error) {
      console.log(error)
      await reply
        .label(LK.ID, user.id)
        .style(Styles.Error)
        .ephemeral(true)
        .send($t('command.error.noDM', { user: user.username }))
    }
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setPermissions([Discord.PFlags.Administrator])
@CommandFactory('simulate', 'Simulates events for the database.')
export class SimulateCommand {
  @Command.setValidator(isOP => isOP)
  @Command.addMentionableOption('user', 'The user to target.')
  @Command.addSubCommand('user', 'Simulate a user joining the server.')
  public static async user(ci: DT.ChatInteraction, args: DT.Args<[['user', User]]>) {
    const re = new DiscordInteraction.Reply(ci)

    const guild = re.getGuild()
    const user: User = args.user()
    const member = await re.getGuildMember(user)

    if (user === Discord.Client.user) {
      await re.label(LK.ID, user.id).style(Styles.Error).send($t('command.error.noDM', { user: user.username }))
      return
    }

    if (!user || !guild || !member) {
      await re.ephemeral(true)
        .send(`Could not find ${user} in guild.`, { flags: MessageFlags.SuppressNotifications })
      return
    }

    await re.ephemeral(true)
      .send(`Simulating user join for ${user}`, { flags: MessageFlags.SuppressNotifications })

    GuildDBController.instance(guild).upsertGuild().catch(logger.catchError)
    UserDBController.instance(member).upsertUser().catch(logger.catchError)
  }

  @Command.setValidator(isOP => isOP)
  @Command.addSubCommand('guild', 'Simulate the bot joining the current guild.')
  public static async guild(ci: DT.ChatInteraction) {
    const re = new DiscordInteraction.Reply(ci)
    const guild = re.getGuild()

    if (!guild) {
      await re.ephemeral(true)
        .send(`Could not simulate a join to this guild.`)
      return
    }

    GuildDBController.instance(guild).upsertGuild()
    await re.ephemeral(true).send(`Simulating guild join.`)
  }
}

@Factory.setContexts(ICT.Guild)
@Factory.setPermissions([Discord.PFlags.BanMembers])
@CommandFactory('ping', 'Ping the bot.')
export class PingCommand {
  // This should be defined as the base function to call.
  @Options.slashOnly()
  public static async main(ci: DT.ChatInteraction) {
    let timestamp = new Date()
    const reply = await new DiscordInteraction.Reply(ci).defer()

    await new Promise((re) => {
      process.nextTick(() => {
        re(undefined)
      })
    })

    const tickRate = msCompare(timestamp, new Date())
    timestamp = new Date()

    await GuildDBController.ping()
    const dbMs = msCompare(timestamp, new Date())
    timestamp = new Date()

    await Discord.Client.application!.fetch()
    const discordMs = msCompare(timestamp, new Date())

    reply.send(`🏓 [PONG!] Discord: \`${discordMs}ms\` | TickRate: \`${tickRate}ms\` | DB: \`${dbMs}ms\` `)
  }
}
