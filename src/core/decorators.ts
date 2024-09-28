import type {
  APIApplicationCommandOptionChoice,
  ApplicationIntegrationType,
  InteractionContextType,
  RestOrArray,
  SlashCommandNumberOption,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js'
import 'reflect-metadata'

import * as Discord from './discord'
import { CommandSettings, CommandVarSettings, SubCommandType as SCT } from './discord'
import Deferrer from './utils/deferrer'
import getMethods from './utils/method'
import type * as DT from '~/types/discord'

const defer = new Deferrer()

export function CommandFactory(
  name: string,
  description: string,
) {
  return function (target: any, _context: any) {
    name = name.toLowerCase() // Discord command names must be lowercase.
    const metadata = { name, description }

    Reflect.defineMetadata('command', metadata, target)

    const methods = getMethods(target)
    methods.forEach((method) => {
      Reflect.defineProperty(method, 'parent', { value: target })
    })

    const command = new SlashCommandBuilder()
      .setName(metadata.name)
      .setDescription(metadata.description)
      .setDefaultMemberPermissions(0)

    Discord.Commands.getMap().set(metadata.name, {
      data: command,
      main: target.main,
      subcommands: new Map<string, DT.CommandStore['main']>(),
    })

    defer.resolve()
  }
}

export abstract class CommandMeta {
  private static mk = 'meta:settings'
  private static kp = '_lastMetaTarget'

  public static update(target: any, withMeta: DT.SubCommandMeta) {
    Reflect.defineProperty(target, CommandMeta.kp, {
      value: withMeta,
      writable: true,
      configurable: true,
    })
    return withMeta
  }

  public static set(target: any, property: string, value: any) {
    const meta = target._lastMetaTarget || {}
    const hasOwnProperty = Object.prototype.hasOwnProperty.call(meta, property)

    if (hasOwnProperty)
      meta[property] = value
    else
      return undefined

    Reflect.defineProperty(target, CommandMeta.kp, {
      value: meta,
      writable: true,
      configurable: true,
    })
    return meta
  }

  /**
   * Provides command settings to the parent command.
   * @param parent The function to set metadata for.
   * @param commandSettings The settings for the functions command.
   * @returns The command settings provided. (commandSettings)
   */
  public static setParentMeta(parent: any, commandSettings: Discord.CommandSettings[]) {
    Reflect.defineMetadata(CommandMeta.mk, commandSettings, parent)
    return commandSettings
  }

  /**
   * Get the command settings from the parent command.
   * @param parent The function to get metadata for.
   * @returns The command settings set within its metadata.
   */
  public static getParentMeta(parent: any): Discord.CommandSettings[] {
    return Reflect.getMetadata(CommandMeta.mk, parent) || []
  }

  public static get(target: any): DT.SubCommandMeta {
    return target[CommandMeta.kp] || { settings: [] }
  }
}

export abstract class Factory {
  private static updateCommand(metadata: { name: string, description: string }, command: DT.CommandStore) {
    Discord.Commands.getMap().set(metadata.name, {
      data: command.data,
      main: command.main,
      subcommands: command.subcommands,
    })
  }

  public static NSFW() {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      command.data.setNSFW(true)
      Factory.updateCommand(metadata, command)
    }
  }

  public static setPermissions(permissions?: DT.Permissions[], assert?: DT.Permissions) {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command)
        throw new Error('Command not yet defined in this context.')

      if (assert) {
        command.data.setDefaultMemberPermissions(assert)
        Factory.updateCommand(metadata, command)
        return
      }

      if (!permissions)
        throw new Error('Permissions not defined.')

      const perms = new Discord.PermissionBuilder()
      if (permissions) {
        for (const permission of permissions) {
          if (permission)
            perms.add(permission as any)
        }
      }

      command.data.setDefaultMemberPermissions(perms.valueOf())
      Factory.updateCommand(metadata, command)
    }
  }

  public static setIntegrations(integrationTypes: RestOrArray<ApplicationIntegrationType>) {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      // (command.data as any).integration_types = value
      command.data.setIntegrationTypes(...integrationTypes)
      Factory.updateCommand(metadata, command)
    }
  }

  public static setContexts(...contexts: RestOrArray<InteractionContextType>) {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      // (command.data as any).contexts = value
      command.data.setContexts(...contexts)
      Factory.updateCommand(metadata, command)
    }
  }
}

export abstract class Options {
  private static main(target: any, meta: DT.SubCommandMeta, config: any) {
    const vars: DT.SubCommandMeta[] = Reflect.getOwnMetadata('command:vars', target)
    if (!vars.includes(meta))
      throw new Error(`The variable "${meta.name}" of type "${meta.type}" is not defined in function "${target.name}".`)
    target.commandOptions.set(meta.name, config)
  }

  /** Sets data on parent. */
  public static defer() {
    return function (target: any, _context: any) {
      const meta = CommandMeta.getParentMeta(target)
      if (!meta)
        throw new Error(`Expected \`<CommandMeta>\` got ${meta}.`)
      meta.push(CommandSettings.Defer)
      CommandMeta.setParentMeta(target, meta)
    }
  }

  /** Sets data on parent. */
  public static slashOnly() {
    return function (target: any, _context: any) {
      const meta = CommandMeta.getParentMeta(target)
      if (!meta)
        throw new Error(`Expected \`<CommandMeta>\` got ${meta}.`)
      meta.push(CommandSettings.SlashOnly)
      CommandMeta.setParentMeta(target, meta)
    }
  }

  /**
   * Sets options for the command under it, and propagates to the parent.
   * @param settings The enum settings for this command.
   * @returns void
   */
  public static set(...settings: CommandVarSettings[]) {
    return function (target: any, _context: any) {
      const meta = CommandMeta.set(target, 'settings', settings)
      if (!meta)
        throw new Error(`Expected \`<CommandMeta>\` got ${meta}.`)
    }
  }

  public static string(config: DT.Configs['SlashString']) {
    return function (target: any, _context: any) {
      Options.main(target, CommandMeta.get(target), config)
    }
  }

  public static stringChoice(...choices: string[]) {
    const opts: RestOrArray<APIApplicationCommandOptionChoice<string>> = []
    for (const choice of choices) {
      opts.push({ name: String(choice), value: choice })
    }
    const func = (hook: any) => hook.addChoices(...opts)
    return function (target: any, _context: any) {
      Options.main(target, CommandMeta.get(target), func)
    }
  }

  public static number(config: DT.SlashConfig<SlashCommandNumberOption>) {
    return function (target: any, _context: any) {
      Options.main(target, CommandMeta.get(target), config)
    }
  }
}

export abstract class Command {
  private static subCommand(
    target: any,
    mutator: (
      command: SlashCommandSubcommandBuilder,
      ...args: any
    ) => SlashCommandSubcommandBuilder | SlashCommandSubcommandsOnlyBuilder,
    ignore: boolean = false,
  ) {
    const subCommandMeta = Reflect.getMetadata('subcommand', target)
    if (!subCommandMeta)
      throw new Error('No metadata found for key "subcommand".')

    if (ignore)
      return

    target.subCommand = mutator(target.subCommand)
  }

  private static prepare(
    target: any,
    mutator: (
      command: SlashCommandBuilder,
      ...args: any
    ) => SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder,
    isSubCommandSetup: boolean = false,
  ) {
    defer.then(() => {
      if (!target.parent) {
        const msg = '"Command" decorators must be defined inside a Command "Factory".\n\t"target.parent" is undefined.\n'
        throw new Error(msg)
      }

      const parentMeta = Reflect.getMetadata('command', target.parent)
      const subCommand = Reflect.getMetadata('subcommand', target)
      const command = Discord.Commands.getMap().get(parentMeta.name)
      if (!command)
        throw new Error('A command was created but became undefined.')

      if (subCommand)
        Command.subCommand(target, mutator as any, isSubCommandSetup)

      if (subCommand) {
        command.subcommands.set(subCommand, target)
        Discord.Commands.getMap().set(parentMeta.name, {
          data: command.data,
          main: command.main,
          subcommands: command.subcommands,
        })
        if (!isSubCommandSetup)
          return
      }

      const mutation = mutator(command.data as SlashCommandBuilder)
      Discord.Commands.getMap().set(parentMeta.name, {
        data: mutation || command.data,
        main: command.main,
        subcommands: command.subcommands,
      })
    })
  }

  private static wrapper(target: any, name: string, description: string, settings: Discord.CommandVarSettings[]) {
    return (command: any) => {
      const lastMetaTarget = CommandMeta.get(target)
      const cmdOptions: DT.Configs['options'] = target.commandOptions
      const wrapper = cmdOptions && cmdOptions.get(name) || undefined
      // If no settings passed, pull from last known metadata. (Sanity check via argument name.)
      if (lastMetaTarget.name === name && settings.length === 0)
        settings = lastMetaTarget && (lastMetaTarget.settings as any) || []
      let re = command
        .setName(name)
        .setDescription(description)
        .setRequired(settings.includes(CommandVarSettings.Required))
      if (wrapper)
        re = wrapper(re)
      return re
    }
  }

  private static initOptions(name: string, type: DT.SubCommandType, target: any, settings: Discord.CommandVarSettings[]) {
    const key = 'command:vars'
    const meta: DT.SubCommandMeta[] = Reflect.getOwnMetadata(key, target) || []
    target.commandOptions = target.commandOptions || new Map<string, (config: any) => any>()
    meta.push(CommandMeta.update(target, { name, type, settings }))
    Reflect.defineMetadata(key, meta, target)
  }

  public static addSubCommand(name: string, description: string) {
    return function (target: any, _context: any) {
      Reflect.defineMetadata('subcommand', name, target)
      target.subCommand = new SlashCommandSubcommandBuilder()
        .setName(name)
        .setDescription(description)
      Command.prepare(target, command => command.addSubcommand(target.subCommand), true)
    }
  }

  public static setValidator(validator: DT.CommandValidator) {
    return function (target: any, _context: any) {
      Reflect.defineProperty(target, 'validator', { value: validator })
    }
  }

  public static addBooleanOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Bool, target, settings)
      Command.prepare(
        target,
        command => command.addBooleanOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addStringOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.String, target, settings)
      Command.prepare(
        target,
        command => command.addStringOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  /** Add an integer (whole number) option. */
  public static addIntegerOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Number, target, settings)
      Command.prepare(
        target,
        command => command.addIntegerOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  /** Add a double (decimal number) option. */
  public static addNumberOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Number, target, settings)
      Command.prepare(
        target,
        command => command.addNumberOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addUserOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.User, target, settings)
      Command.prepare(
        target,
        command => command.addUserOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addChannelOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Channel, target, settings)
      Command.prepare(
        target,
        command => command.addChannelOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addRoleOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Role, target, settings)
      Command.prepare(
        target,
        command => command.addRoleOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addAttachmentOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Attachment, target, settings)
      Command.prepare(
        target,
        command => command.addAttachmentOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addMentionableOption(
    name: string,
    description: string,
    settings: CommandVarSettings[] = [],
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, SCT.Mentionable, target, settings)
      Command.prepare(
        target,
        command => command.addMentionableOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }
}
