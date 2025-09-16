import type {
  APIInteractionGuildMember,
  ApplicationCommandOptionBase,
  ApplicationCommandPermissions,
  CacheType,
  ChatInputCommandInteraction,
  ClientUser,
  Collection,
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
  Snowflake,
  User,
} from 'discord.js'
import type { KeyedFunction, KeyedFunctionGroup } from './util'
import type { CommandVarSettings, SubCommandType as DSubCommandType } from '~/core/discord'

export type SubCommandType = DSubCommandType
export type CommandData = DSlashCommandBuilder | SlashCommandOptionsOnlyBuilder
export type CommandOption = ApplicationCommandOptionBase
export interface SubCommandMeta { value?: any, name: string, type: SubCommandType, settings: CommandVarSettings[] }
export type Permissions = DPermissions | bigint | number | null | undefined
export type Interaction = DInteraction<CacheType>
export type CommandMember = GuildMember | APIInteractionGuildMember | null | undefined
export type CommandValidator = (isOP: boolean, user: User, member: CommandMember | undefined) => boolean
export type UserLike = User | ClientUser
export type InteractionInit = ChatInputCommandInteraction | Message | undefined
export type InteractionAuthor = User | CommandMember

export interface ChatInteractionAssert {
  author: User
  interaction: ChatInputCommandInteraction<CacheType>
  message: Message<boolean>
}

/** Alias of {@link KeyedFunction} */
export type F<K extends string, T> = KeyedFunction<K, T>

/** Alias of {@link KeyedFunctionGroup} */
export type Args<T extends [string, any][]> = KeyedFunctionGroup<T>

/**
 * Interaction OR Message are ALWAYS defined.
 */
export interface ChatInteraction {
  author: User
  interaction?: ChatInteractionAssert['interaction']
  message?: ChatInteractionAssert['message']
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

export interface PermsResponseInterface {
  collection: Collection<Snowflake, ApplicationCommandPermissions[]>
  timestamp: Date
}

export * as DT from '~/types/discord'
