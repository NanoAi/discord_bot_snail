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
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js'

console.log('\n'.repeat(5))
console.clear()

const intents: ClientOptions['intents'] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.AutoModerationExecution,
]

export const Client = new DClient({ intents })
/** Permission Flags. */
export const PFlags: typeof PermissionFlagsBits = PermissionFlagsBits
export const PermissionBuilder: typeof PermissionsBitField = PermissionsBitField
export type CommandData = DSlashCommandBuilder | SlashCommandOptionsOnlyBuilder
export type CommandOption = ApplicationCommandOptionBase
export type Permissions = DPermissions | bigint | number | null | undefined
export type Interaction = DInteraction<CacheType>

interface IChatInteraction {
  interaction: ChatInputCommandInteraction<CacheType>
  message: Message<boolean>
}

/**
 * Interaction OR Message are ALWAYS defined.
 */
export interface ChatInteraction {
  interaction?: IChatInteraction['interaction']
  message?: IChatInteraction['message']
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

  pass.forEach((v: any) => {
    hoisted[v.name] = v.value
  })

  vars.forEach((v: any) => {
    options[v] = (fallback: any) => {
      const re = hoisted[v]
      if (typeof re !== 'undefined')
        return re
      return fallback
    }
  })

  return options as { [key: string]: () => any }
}

function getMessageOptions(func: any, pass: string[] = []) {
  const options: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func)

  for (const key in vars) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const value = vars[key]
      console.log(key, value)
      options[value] = (fallback: any) => {
        const re = pass[Number(key)]
        if (typeof re !== 'undefined')
          return re
        return fallback
      }
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
  private ci: ChatInteraction
  private messagePromise: PromiseWithResolvers<IChatInteraction['message']>
  private interactionPromise: PromiseWithResolvers<IChatInteraction['interaction']>

  constructor(ci: ChatInteraction) {
    this.ci = ci
    this.messagePromise = Promise.withResolvers<IChatInteraction['message']>()
    this.interactionPromise = Promise.withResolvers<IChatInteraction['interaction']>()

    if (this.ci.interaction) {
      this.messagePromise.reject()
      this.interactionPromise.resolve(this.ci.interaction!)
    }
    else {
      this.interactionPromise.reject()
      this.messagePromise.resolve(this.ci.message!)
    }
  }

  interaction(callback: (interaction: IChatInteraction['interaction']) => void) {
    this.interactionPromise.promise.then(callback).catch(() => {})
    return this
  }

  message(callback: (message: IChatInteraction['message']) => void) {
    this.messagePromise.promise.then(callback).catch(() => {})
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

  const matcher = [...content.matchAll(/^;(\w+)(?:(;| )([\w ]+))?/g)]
  if (matcher.length === 0)
    return

  const match: (string | undefined)[] = []
  matcher[0].forEach((v, k) => {
    match[k] = v && String(v) || undefined
  })

  const baseCommand = match[1]
  let args = (match[3] || '').split(' ')
  const subCommand = match[2] === ';' && args[0] || undefined

  if (subCommand)
    args = args.splice(1, 1)

  const command = Commands.getCommand(baseCommand!)
  const ci: ChatInteraction = { message }
  processCommand(getMessageOptions, ci, args, command, subCommand)
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
