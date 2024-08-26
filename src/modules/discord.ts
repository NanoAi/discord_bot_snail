import type {
  ApplicationCommandOptionBase,
  CacheType,
  ChatInputCommandInteraction,
  ClientOptions,
  Interaction as DInteraction,
  Permissions as DPermissions,
  REST as DRestClient,
  SlashCommandBuilder as DSlashCommandBuilder,
  InteractionReplyOptions,
  Message,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import {
  Client as DClient,
  Routes as DRoutes,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js'
import { logger } from './utils/logger'
import { Convert } from '~/modules/convert'

console.log('\r\n'.repeat(12))
console.clear()
console.clear()

const intents: ClientOptions['intents'] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.AutoModerationExecution,
]

const partials = [
  Partials.Channel,
  Partials.Message,
]

export const Routes = DRoutes
export const Client = new DClient({ intents, partials })
/** Permission Flags. */
export const PFlags: typeof PermissionFlagsBits = PermissionFlagsBits
export const PermissionBuilder: typeof PermissionsBitField = PermissionsBitField
export type CommandData = DSlashCommandBuilder | SlashCommandOptionsOnlyBuilder
export type CommandOption = ApplicationCommandOptionBase
export type SubCommandType = string
export interface SubCommandMeta { name: string, type: SubCommandType }
export type Permissions = DPermissions | bigint | number | null | undefined
export type Interaction = DInteraction<CacheType>

export interface ChatInteractionAssert {
  interaction: ChatInputCommandInteraction<CacheType>
  message: Message<boolean>
}

/**
 * Interaction OR Message are ALWAYS defined.
 */
export interface ChatInteraction {
  interaction?: ChatInteractionAssert['interaction']
  message?: ChatInteractionAssert['message']
}

export interface CommandSettings {
  required?: boolean
}

export interface Configs {
  base: SlashCommandOptionsOnlyBuilder
  options: Map<string, (config: any) => any>
  SlashString: (options: SlashCommandStringOption) => SlashCommandStringOption
  SlashSubCmd: (options: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder
}

export interface CommandStore {
  data:
    | DSlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
  subcommands: Map<string, any>
  main?: (interaction: ChatInteraction, options: any) => void
}

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

export class Global {
  public static REST: DRestClient
}

export class Commands {
  private static commands = new Map<string, CommandStore>()

  public static lock() {
    Object.freeze(this.commands)
  }

  public static getCommandsAsJson() {
    const commandsAsJson: any[] = []
    for (const command of this.commands.values()) {
      commandsAsJson.push(command.data.toJSON())
    }
    // console.log(commandsAsJson, '\r\n\r\n')
    return commandsAsJson
  }

  public static getCommand(command: string) {
    return this.commands.get(command)
  }

  public static setCommand(key: string, value: CommandStore) {
    return this.commands.set(key, value)
  }

  public static getMap() {
    return this.commands
  }
}

function getOptions(func: any, pass: any[], ci: ChatInteractionAssert) {
  const options: any = []
  const hoisted: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func) || []

  pass.forEach((v: { name: string, value: any }) => {
    hoisted[v.name] = v.value
  })

  vars.forEach((v: SubCommandMeta) => {
    options[v.name] = (fallback: any) => {
      const re = hoisted[v.name]
      // console.log('Response: ', re, typeof re, '\n---\n', ci)
      if (typeof re !== 'undefined')
        return Convert.ValueToType(ci, re, v.type)
      return fallback
    }
  })

  return options as { [key: string]: () => any }
}

function getMessageOptions(func: any, pass: string[] = [], ci: ChatInteractionAssert) {
  const options: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func)

  for (const key in vars) {
    const value: SubCommandMeta = vars[key]
    options[value.name] = (fallback: any) => {
      let re = pass.length > 0 && pass[Number(key)] || undefined
      if (typeof re === 'object')
        re = re[1] && re[1] || re[0]
      if (typeof re !== 'undefined')
        return Convert.ValueToType(ci, re, value.type)
      return fallback
    }
  }

  return options as { [key: string]: () => any }
}

class CommandProcessor {
  private static call(
    getter: any,
    ci: ChatInteraction,
    opts: any[] = [],
    command: CommandStore,
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
      command.main(ci, getter(command.main, opts, ci))
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
        func(ci, getter(func, opts, ci))
      }
      output = !!func
    }

    return output
  }

  public static process(
    getter: any,
    ci: ChatInteraction,
    opts: any[] = [],
    command?: CommandStore,
    subId?: string,
  ) {
    let output = false

    if (command) {
      output = CommandProcessor.call(getter, ci, opts, command, command.subcommands, subId)
    }

    if (!output) {
      if (ci.interaction)
        ci.interaction.reply({ content: 'Command not found.', ephemeral: true })
      else
        ci.message!.reply('Command not found.').then(msg => setTimeout(() => msg.delete(), 1000))
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

  const matcher = [...content.matchAll(/^\?(\w+)(?:(;| )(.+))?/g)]
  if (matcher.length === 0)
    return

  const match: (string | undefined)[] = []
  matcher[0].forEach((v, k) => {
    match[k] = v && String(v) || undefined
  })

  const baseCommand = match[1]
  let args = [...(match[3] || '').matchAll(/['"]([^'"]+)['"]|\S+/g)]
  const subCommand = match[2] === activator && (args && String(args[0][0])) || undefined

  if (subCommand && subCommand.match(/\w+/g))
    args = args.splice(1, 1)

  const command = Commands.getCommand(baseCommand!)
  const ci: ChatInteraction = { message }
  const finalArgs = args.length > 0 && args || undefined

  // console.log('[DEBUG] Command: ', baseCommand)
  // console.log('[DEBUG] subCommand: ', subCommand)
  // console.log('[DEBUG] Arguments', args)

  CommandProcessor.process(getMessageOptions, ci, finalArgs, command, subCommand)
})

Client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand())
    return

  const name = interaction.commandName
  const command = Commands.getCommand(name)
  const ci: ChatInteraction = { interaction }

  const subCommandId = (interaction.options as any)._subcommand
  const hoistedOptions = (interaction.options as any)._hoistedOptions
  CommandProcessor.process(getOptions, ci, hoistedOptions, command, subCommandId)
})
