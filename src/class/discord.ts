import type {
  ApplicationCommandOptionBase,
  CacheType,
  ChatInputCommandInteraction,
  ClientOptions,
  Interaction as DInteraction,
  Permissions as DPermissions,
  SlashCommandBuilder as DSlashCommandBuilder,
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
export type ChatInteraction = ChatInputCommandInteraction<CacheType>

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
  main?: (interaction: DInteraction<CacheType>) => void
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
  const vars = Reflect.getOwnMetadata('command:vars', func)

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

/*
function getMessageOptions(func: any, pass: string[number]) {
  const options: any = []
  const vars = Reflect.getOwnMetadata('command:vars', func)

  for (const key in vars) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const value = vars[key]
      console.log(key, value)
      options[value] = (fallback: any) => {
        if (typeof pass[Number(key)] !== 'undefined')
          return pass[Number(key)]
        return fallback
      }
    }
  }

  return options as { [key: string]: () => any }
}
*/

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

  // console.log(match)
  message.reply(`Base: ${baseCommand}\nSub: ${subCommand}\nArgs: ${args.join(',')}`)
})

Client.on(Events.InteractionCreate, async (inter) => {
  if (!inter.isChatInputCommand())
    return

  const name = inter.commandName
  const command = Commands.getCommand(name)
  const subCommandId = (inter.options as any)._subcommand
  const hoistedOptions = (inter.options as any)._hoistedOptions

  if (command) {
    const subcommands = command.subcommands
    if (command.main)
      command.main(inter)
    if (subCommandId) {
      const func: any = subcommands.get(subCommandId)
      func(inter, getOptions(func, hoistedOptions))
    }
  }
})
