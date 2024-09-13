import type {
  APIInteractionGuildMember,
  ApplicationCommandOptionBase,
  CacheType,
  ChatInputCommandInteraction,
  Interaction as DInteraction,
  Permissions as DPermissions,
  SlashCommandBuilder as DSlashCommandBuilder,
  GuildMember,
  Message,
  SlashCommandNumberOption,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  User,
} from 'discord.js'

export type CommandData = DSlashCommandBuilder | SlashCommandOptionsOnlyBuilder
export type CommandOption = ApplicationCommandOptionBase
export type SubCommandType = string
export interface SubCommandMeta { name: string, type: SubCommandType }
export type Permissions = DPermissions | bigint | number | null | undefined
export type Interaction = DInteraction<CacheType>
export type CommandMember = GuildMember | APIInteractionGuildMember | null
export type CommandValidator = (isOP: boolean, user: User, member: CommandMember) => boolean

export interface ChatInteractionAssert {
  interaction: ChatInputCommandInteraction<CacheType>
  message: Message<boolean>
}

export type CommandFunction<T extends string, V> = {
  [K in T]: (value?: unknown) => V
}

export type CommandFunctionGroup<T extends [string, any][]> = {
  [K in T[number] as K[0]]: (value?: K[1]) => K[1];
}

/** Alias of CommandFunction */
export type F<K extends string, T> = CommandFunction<K, T>

/** Alias of CommandArgsGroup */
export type Args<T extends [string, any][]> = CommandFunctionGroup<T>

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
  SlashNumber: (options: SlashCommandNumberOption) => SlashCommandNumberOption
  SlashSubCmd: (options: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder
}

export type SlashConfig<T extends CommandOption> = ((options: T) => any)

export interface CommandStore {
  data:
    | DSlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
  subcommands: Map<string, any>
  main?: (interaction: ChatInteraction, options: any) => void
  id?: string
}

export * as DT from '~/types/discord'
