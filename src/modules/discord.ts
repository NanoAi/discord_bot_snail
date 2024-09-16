import process from 'node:process'
import type {
  ApplicationCommandPermissions,
  Channel,
  ClientOptions,
  REST as DRestClient,
  GuildMember,
  GuildResolvable,
  Message,
} from 'discord.js'
import {
  ApplicationCommandPermissionType,
  ClientUser,
  Client as DClient,
  Routes as DRoutes,
  Events,
  GatewayIntentBits,
  Guild,
  Partials,
  PermissionFlagsBits,
  PermissionsBitField,
  User,
} from 'discord.js'
import NodeCache from 'node-cache'
import { operators } from '../../admins.json'
import { logger } from './utils/logger'
import { Convert } from '~/modules/convert'
import type * as DT from '~/types/discord'

console.log('\r\n'.repeat(12))
console.clear()
console.clear()

const intents: ClientOptions['intents'] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.AutoModerationExecution,
]

const partials = [
  Partials.Channel,
  Partials.Message,
  Partials.Reaction,
  Partials.GuildMember,
  Partials.GuildScheduledEvent,
]

const CommandRunManager = new NodeCache({ stdTTL: 1, checkperiod: 1 })
export const GuildPermsCache = new NodeCache({ stdTTL: 300, checkperiod: 30 })

export const Routes = DRoutes
export const Client = new DClient({ intents, partials })
/** Permission Flags. */
export const PFlags: typeof PermissionFlagsBits = PermissionFlagsBits
export const PermissionBuilder: typeof PermissionsBitField = PermissionsBitField

/**
 * Interaction Context Types.
 * @readonly
 */
export class InteractionContextType {
  /** Interaction can be used within servers */
  static readonly GUILD = 0
  /** Interaction can be used within DMs with the app's bot user */
  static readonly BOT_DM = 1
  /** Interaction can be used within Group DMs and DMs other than the app's bot user */
  static readonly PRIVATE_CHANNEL = 2
  /** Interaction can be used with `GUILD`, `BOT_DM`, and `PRIVATE_CHANNEL` */
  static readonly ALL = [0, 1, 2]
}

/**
 * Application Integration Types.
 * @readonly
 */
export class IntegrationType {
  /** App is installable to servers */
  static readonly GUILD_INSTALL = 0
  /** App is installable to users */
  static readonly USER_INSTALL = 1
  /** App is installable to both servers and users */
  static readonly ALL = [0, 1]
}

export enum SubCommandType {
  Attachment,
  Bool,
  Channel,
  Mentionable,
  Number,
  Role,
  String,
  User,
}

export class Global {
  public static REST: DRestClient

  public static Application() {
    if (!Client.application)
      throw new Error(`Expected "Application" got "${Client.application}".`)
    return Client.application
  }
}

function realmLoopHelper(realm: ApplicationCommandPermissions, caller: User, channel: Channel, member: GuildMember) {
  if (!realm)
    return false
  switch (realm.type) {
    case ApplicationCommandPermissionType.User:
      return (caller.id === realm.id) && realm.permission
    case ApplicationCommandPermissionType.Channel:
      return (channel.id === realm.id) && realm.permission
    case ApplicationCommandPermissionType.Role: {
      const role = member.roles.cache.find(role => role.id === realm.id)
      return role && realm.permission
    }
    default:
      return false
  }
}

export function isUser(target: any) {
  return (target instanceof User || target instanceof ClientUser)
}

export class Commands {
  private static commands = new Map<string, DT.CommandStore>()

  public static lock() {
    Object.freeze(this.commands)
  }

  public static getCommandsAsJson() {
    const commandsAsJson: any[] = []
    for (const command of this.commands.values()) {
      commandsAsJson.push(command.data.toJSON())
    }
    // console.log('[DEBUG]\n', commandsAsJson, '\r\n\r\n')
    return commandsAsJson
  }

  public static async syncCommands() {
    const commandsUpdated = []
    const app = Client.application

    if (!app)
      throw new Error(`Unable to synchronize commands, expected "Application" got "${app}".`)

    const commands = await app.commands.fetch()
    for (const [_, command] of commands) {
      if (command.guild !== null)
        continue

      const internal = this.commands.get(command.name)
      if (internal) {
        internal.id = command.id
        this.commands.set(command.name, internal)
        commandsUpdated.push(command.name)
      }
    }

    return { updated: commandsUpdated, found: commands.size }
  }

  public static async fetchGuildPermissions(guild: Guild | GuildResolvable) {
    const resolvable = (guild instanceof Guild) ? guild.id : guild
    const cache = GuildPermsCache.get<DT.PermsResponseInterface>(resolvable.toString())

    if (cache) {
      console.log('[DEBUG:CACHE][HIT]', resolvable.toString(), cache)
      return cache.collection
    }

    console.log('[DEBUG:CACHE][MISS]', resolvable.toString(), '<PENDING>')
    const collection = await Global.Application().commands.permissions.fetch({ guild: resolvable })
    GuildPermsCache.set(resolvable.toString(), { collection, timestamp: new Date() })

    return collection
  }

  public static async hasGuildPermission(
    guild: Guild | GuildResolvable,
    command: DT.CommandStore,
    caller: User,
    channel: Channel,
    member: GuildMember,
  ) {
    if (!command.id)
      throw new Error('The command must be synchronized to Discord.')

    if (member.permissions.has(PFlags.Administrator))
      return true

    const commandPerms = await this.fetchGuildPermissions(guild)
    const realms = commandPerms.get(command.id)

    if (realms && realms.length > 0) {
      for (const realm of realms) {
        if (realmLoopHelper(realm, caller, channel, member))
          return true
      }
    }

    return false
  }

  public static getCommand(command: string) {
    return this.commands.get(command)
  }

  public static setCommand(key: string, value: DT.CommandStore) {
    return this.commands.set(key, value)
  }

  public static getMap() {
    return this.commands
  }
}

async function getOptions(func: any, pass: any[], ci: DT.ChatInteractionAssert) {
  const options: any = []
  const hoisted: any = []
  const vars: DT.SubCommandMeta[] = Reflect.getOwnMetadata('command:vars', func) || []

  for (const value of pass) {
    hoisted[value.name] = value.value
  }

  for (const value of vars) {
    let output: any
    const re = hoisted[value.name]

    if (typeof re !== 'undefined')
      output = await Convert.ValueToType(ci, re, value.type)

    options[value.name] = (fallback: any) => {
      return output || fallback
    }
  }

  return options as { [key: string]: () => any }
}

async function getMessageOptions(func: any, args: string[], ci: DT.ChatInteractionAssert) {
  const options: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func)

  for (const key in vars) {
    let output: any

    const nKey = Number(key)
    const value: DT.SubCommandMeta = vars[key]
    const captureRest = value.settings && value.settings.captureRest

    let re: string | undefined = args && args.length > 0 && args[nKey] || undefined

    /*
    if (typeof re === 'object')
      re = re[1] && re[1] || re[0]
    */

    if (re && captureRest)
      re = args.slice(nKey).join(' ')

    if (typeof re !== 'undefined')
      output = (await Convert.ValueToType(ci, re, value.type))

    options[value.name] = (fallback: any) => {
      return output || fallback
    }
  }

  return options as { [key: string]: () => any }
}

function commandValidate(ci: DT.ChatInteraction, func: any) {
  const validator: DT.CommandValidator = func.validator
  if (validator) {
    const user = ci.interaction && ci.interaction.user || ci.message!.author
    const member = ci.interaction && ci.interaction.member || ci.message!.member
    return validator(operators.includes(user.id), user, member)
  }
  return true
}

class CommandProcessor {
  private static async call(
    getter: any,
    ci: DT.ChatInteraction,
    opts: any[] = [],
    command: DT.CommandStore,
    subcommands: Map<string, any>,
    subId?: string,
  ) {
    let output = false

    if (command.main) {
      if (ci.message && (command.main as any)._assert) {
        return false
      }
      if (ci.interaction && (command.main as any)._defer) {
        ci.interaction.deferReply()
      }
      if (commandValidate(ci, command.main))
        command.main(ci, await getter(command.main, opts, ci))
      else
        return false
      output = true
    }

    if (subId) {
      const func: any = subcommands.get(subId)
      if (func) {
        if (ci.message && func._assert) {
          return false
        }
        if (ci.interaction && func._defer && !ci.interaction.deferred) {
          ci.interaction.deferReply()
        }
        if (commandValidate(ci, func))
          func(ci, await getter(func, opts, ci))
        else
          return false
      }
      output = !!func
    }

    return output
  }

  public static async checkMessagePermissions(message: Message<boolean>, command: DT.CommandStore) {
    if (!message.inGuild() || !message.guild || !message.member)
      return false

    if (!command.id) {
      await message.reply('Command not registered.').then(msg => setTimeout(() => msg.delete(), 1000))
      return false
    }

    const caller = message.author
    const member = message.member
    const channel = message.channel
    const channelPerms = channel.permissionsFor(caller, true)

    if (!channelPerms)
      return false

    const canUse = channelPerms.has(PFlags.UseApplicationCommands)
    return canUse && await Commands.hasGuildPermission(message.guild, command, caller, channel, member)
  }

  public static async process(
    getter: any,
    ci: DT.ChatInteraction,
    opts: string[] = [],
    command?: DT.CommandStore,
    subId?: string,
  ) {
    let output = false

    if (command) {
      output = await CommandProcessor.call(getter, ci, opts, command, command.subcommands, subId)
    }

    if (!output) {
      if (ci.interaction)
        await ci.interaction.reply({ content: 'Command not found.', ephemeral: true })
      else
        await ci.message!.reply('Command not found.').then(msg => setTimeout(() => msg.delete(), 1000))
    }
  }
}

export function shutdown() {
  Client.destroy().then(() => {
    logger.info('Client has shutdown via admin request.')
  }).catch(logger.catchError)
}

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return

  const activator = '?'

  const content = message.content
  if (activator !== content.charAt(0))
    return

  // * Maybe this needs to be stored in PostgreSQL?
  const cache = CommandRunManager.get<Date>(message.author.id)
  if (cache)
    return

  const matcher = [...content.matchAll(/^\?(\w+)(?:(;| )(.+))?/g)]
  if (matcher.length === 0)
    return

  const match: (string | undefined)[] = []
  matcher[0].forEach((v, k) => {
    match[k] = v && String(v) || undefined
  })

  const baseCommand = match[1] || ''
  const commandArgs: string[] = []

  const baseMatch = match[3] || ''

  const args = [...baseMatch.matchAll(/['"]([^'"]+)['"]|\S+/g)]
  const subMatch = [...baseMatch.matchAll(/((-{2}|[?;])(\w+))/g)]

  let subCommand = subMatch[0] && subMatch[0][3] || undefined
  const subCommandMatch = subCommand && subMatch[0][1]

  if (args) {
    for (const arg of args) {
      const insert = arg[1] || arg[0]
      if (insert && insert !== subCommandMatch)
        commandArgs.push(insert)
    }
  }

  const command = Commands.getCommand(baseCommand)
  const ci: DT.ChatInteraction = { message }
  CommandRunManager.set(message.author.id, new Date())

  if (command) {
    if (!subCommand && command.subcommands && command.subcommands.size > 0) {
      const hasSubCommand = command.subcommands.has(commandArgs[0])
      if (hasSubCommand)
        subCommand = commandArgs.shift()
    }

    // If we don't have permission to run the command we fail silently.
    if (!(await CommandProcessor.checkMessagePermissions(message, command)))
      return
  }

  /*
  console.log('[DEBUG:PUSHED]', commandArgs)
  console.log('[DEBUG:SUBCMD]', subCommand)
  console.log('[DEBUG] Command: ', baseCommand)
  console.log('[DEBUG] subCommand: ', subCommand)
  console.log('[DEBUG] Arguments', commandArgs)
  */

  CommandProcessor.process(getMessageOptions, ci, commandArgs, command, subCommand)
})

Client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand())
    return

  const name = interaction.commandName
  const command = Commands.getCommand(name)
  const ci: DT.ChatInteraction = { interaction }

  const subCommandId = (interaction.options as any)._subcommand
  const hoistedOptions = (interaction.options as any)._hoistedOptions
  CommandProcessor.process(getOptions, ci, hoistedOptions, command, subCommandId)
})
