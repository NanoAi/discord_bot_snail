import type {
  ApplicationCommandOptionBase,
  CacheType,
  ChatInputCommandInteraction,
  ClientOptions,
  Interaction as DInteraction,
  Permissions as DPermissions,
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
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js'
import { Convert } from '~/modules/convert'

console.log('\n'.repeat(12))
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
interface ChatInteractionAssert {
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
    console.log(commandsAsJson, '\r\n\r\n')
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

function getOptions(func: any, pass: any[]) {
  const options: any = []
  const hoisted: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func) || []

  pass.forEach((v: { name: string, value: any }) => {
    hoisted[v.name] = v.value
  })

  vars.forEach((v: SubCommandMeta) => {
    options[v.name] = (fallback: any) => {
      const re = hoisted[v.name]
      if (typeof re !== 'undefined')
        return Convert.ValueToType(re, v.type)
      return fallback
    }
  })

  return options as { [key: string]: () => any }
}

function getMessageOptions(func: any, pass: string[] = []) {
  const options: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func)

  for (const key in vars) {
    const value: SubCommandMeta = vars[key]
    options[value.name] = (fallback: any) => {
      let re = pass.length > 0 && pass[Number(key)] || undefined
      if (typeof re === 'object')
        re = re[1] && re[1] || re[0]
      if (typeof re !== 'undefined')
        return Convert.ValueToType(re, value.type)
      return fallback
    }
  }

  return options as { [key: string]: () => any }
}

function processCommand(
  getter: any,
  ci: ChatInteraction,
  opts: any[] = [],
  command?: CommandStore,
  subId?: string,
): boolean {
  let re = false

  // console.log('[DEBUG:PROCESS] [1] ', !!command, subId)
  // console.log('[DEBUG:PROCESS] [2] ', command && !!command.main, subId)

  if (command) {
    const subcommands = command.subcommands
    if (command.main) {
      command.main(ci, getter(command.main, opts))
      re = true
    }

    if (subId) {
      const func: any = subcommands.get(subId)
      if (func)
        func(ci, getter(func, opts))
      re = !!func
    }
  }

  if (!re) {
    if (ci.interaction)
      ci.interaction.reply({ content: 'Command not found.', ephemeral: true })
    else
      ci.message!.reply('Command not found.').then(msg => setTimeout(() => msg.delete(), 1000))
  }

  return re
}

export async function reply(ci: ChatInteraction, response: string, options?: InteractionReplyOptions) {
  if (ci.interaction) {
    console.log(response)
    response = response.replaceAll('%username%', ci.interaction.user.username)
    if (options) {
      options.fetchReply = true
      await ci.interaction.reply({ content: response, ...options })
    }
    else {
      await ci.interaction.reply(response)
    }
  }
  else {
    response = response.replaceAll('%username%', ci.message!.author.username)
    await ci.message!.reply(response)
  }
}

export class CommandInteraction {
  private struct: any
  private ci: ChatInteraction
  private internal: PromiseWithResolvers<ChatInteractionAssert['interaction']>

  constructor(ci: ChatInteraction) {
    this.ci = ci
    this.internal = Promise.withResolvers<ChatInteractionAssert['interaction']>()

    if (this.ci.interaction)
      this.internal.resolve(this.ci.interaction!)
    else
      this.internal.reject(this.ci.message!)
  }

  interaction(callback: (interaction: ChatInteractionAssert['interaction']) => void) {
    this.struct = this.internal.promise.then(callback)
    return this
  }

  message(callback: (message: ChatInteractionAssert['message']) => void) {
    this.struct.catch(callback)
    return this
  }
}

export async function acceptInteraction(ci: ChatInteraction) {
  if (ci.interaction) {
    await ci.interaction.reply({ content: '## 🆗', ephemeral: true })
    return ci.interaction
  }
  else {
    await ci.message!.react('🆗')
    return ci.message
  }
}

Client.on(Events.MessageCreate, async (message) => {
  if (message.system || message.author.bot)
    return
  const activator = ';'
  const content = message.content
  if (activator !== content.charAt(0))
    return

  const matcher = [...content.matchAll(/^;(\w+)(?:(;| )(.+))?/g)]
  if (matcher.length === 0)
    return

  const match: (string | undefined)[] = []
  matcher[0].forEach((v, k) => {
    match[k] = v && String(v) || undefined
  })

  const baseCommand = match[1]
  let args = [...(match[3] || '').matchAll(/['"]([^'"]+)['"]|\S+/g)]
  const subCommand = match[2] === ';' && (args && String(args[0][0])) || undefined

  if (subCommand && subCommand.match(/\w+/g))
    args = args.splice(1, 1)

  const command = Commands.getCommand(baseCommand!)
  const ci: ChatInteraction = { message }
  const finalArgs = args.length > 0 && args || undefined

  // console.log('[DEBUG] Command: ', baseCommand)
  // console.log('[DEBUG] subCommand: ', subCommand)
  // console.log('[DEBUG] Arguments', args)

  processCommand(getMessageOptions, ci, finalArgs, command, subCommand)
})

Client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand())
    return

  const name = interaction.commandName
  const command = Commands.getCommand(name)
  const ci: ChatInteraction = { interaction }

  const subCommandId = (interaction.options as any)._subcommand
  const hoistedOptions = (interaction.options as any)._hoistedOptions
  processCommand(getOptions, ci, hoistedOptions, command, subCommandId)
})
