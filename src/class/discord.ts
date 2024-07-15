import type {
  ApplicationCommandOptionBase,
  CacheType,
  ChatInputCommandInteraction,
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

export const Client = new DClient({ intents: [GatewayIntentBits.Guilds] })
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

Client.on(Events.InteractionCreate, async (inter) => {
  if (!inter.isChatInputCommand())
    return

  const command = Commands.getCommand(inter.commandName)
  const subCommandId = (inter.options as any)._subcommand

  const hoistedOptions = (inter.options as any)._hoistedOptions
  const options: any = []
  if (hoistedOptions) {
    hoistedOptions.forEach((v: any) => {
      options[v.name] = v.value
    })
  }

  if (command) {
    const subcommands = command.subcommands
    if (command.main)
      command.main(inter)
    if (subCommandId) {
      const func: (inter: any, options: any) => any = subcommands.get(subCommandId)
      func(inter, options)
    }
  }
})
