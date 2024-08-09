import 'reflect-metadata'
import type {
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js'

import getMethods from './functions/method'
import Deferrer from './deferrer'
import * as Discord from './discord'

const defer = new Deferrer()

export function CommandFactory(
  name: string,
  description: string,
  permissions?: Discord.Permissions[],
) {
  return function (target: any, _context: any) {
    const metadata = { name, description }

    Reflect.defineMetadata('command', metadata, target)

    const methods = getMethods(target)
    methods.forEach((method) => {
      Reflect.defineProperty(method, 'parent', { value: target })
    })

    const perms = new Discord.PermissionBuilder()
    if (permissions) {
      for (const permission of permissions) {
        if (permission)
          perms.add(permission as any)
      }
    }

    const command = new SlashCommandBuilder()
      .setName(metadata.name)
      .setDescription(metadata.description)
      .setDefaultMemberPermissions(perms.valueOf())

    Discord.Commands.getMap().set(metadata.name, {
      data: command,
      main: target.main,
      subcommands: new Map<string, Discord.CommandStore['main']>(),
    })

    defer.resolve()
  }
}

/*
Map(23) {
[x] 'addBooleanOption' => [Function: addBooleanOption],
[x] 'addUserOption' => [Function: addUserOption],
[x] 'addChannelOption' => [Function: addChannelOption],
[x] 'addRoleOption' => [Function: addRoleOption],
[x] 'addAttachmentOption' => [Function: addAttachmentOption],
[x] 'addMentionableOption' => [Function: addMentionableOption],
[x] 'addStringOption' => [Function: addStringOption],
[x] 'addIntegerOption' => [Function: addIntegerOption],
[x] 'addNumberOption' => [Function: addNumberOption],
  '_sharedAddOptionMethod' => [Function: _sharedAddOptionMethod],
[x] 'setName' => [Function: setName],
[x] 'setDescription' => [Function: setDescription],
  'setNameLocalization' => [Function: setNameLocalization],
  'setNameLocalizations' => [Function: setNameLocalizations],
  'setDescriptionLocalization' => [Function: setDescriptionLocalization],
  'setDescriptionLocalizations' => [Function: setDescriptionLocalizations],
  'addSubcommandGroup' => [Function: addSubcommandGroup],
[x] 'addSubcommand' => [Function: addSubcommand],
  'setDefaultPermission' => [Function: setDefaultPermission],
  'setDefaultMemberPermissions' => [Function: setDefaultMemberPermissions],
[x] 'setDMPermission' => [Function: setDMPermission],
[x] 'setNSFW' => [Function: setNSFW],
  'toJSON' => [Function: toJSON]
}

---
runRequiredValidations
setDescription
setDescriptionLocalization
setDescriptionLocalizations
setName
setNameLocalization
setNameLocalizations
setRequired
toJSON
*/

export class Factory {
  private static updateCommand(metadata: { name: string, description: string }, command: Discord.CommandStore) {
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

  public static noDM() {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)

      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      command.data.setDMPermission(false)
      Factory.updateCommand(metadata, command)
    }
  }

  public static setIntegrations(value: Discord.InteractionContextType[]) {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      (command.data as any).integration_types = value
      Factory.updateCommand(metadata, command)
    }
  }

  public static setContexts(value: Discord.IntegrationType[]) {
    return function (target: any, _context: any) {
      const metadata = Reflect.getOwnMetadata('command', target)
      const command = Discord.Commands.getCommand(metadata.name)

      if (!command) {
        throw new Error('Command not yet defined in this context.')
      }

      (command.data as any).contexts = value
      Factory.updateCommand(metadata, command)
    }
  }
}

export class Options {
  private static main(target: any, meta: Discord.SubCommandMeta, config: any) {
    const vars: Discord.SubCommandMeta[] = Reflect.getOwnMetadata('command:vars', target)
    if (!vars.includes(meta))
      throw new Error(`The variable "${meta.name}" of type "${meta.type}" is not defined in function "${target.name}".`)
    target.commandOptions.set(meta.name, config)
  }

  public static defer() {
    return function (target: any, _context: any) {
      Reflect.defineProperty(target, '_defer', { value: true })
    }
  }

  public static string(config: Discord.Configs['SlashString']) {
    return function (target: any, _context: any) {
      Options.main(target, target._lastOptionTarget, config)
    }
  }
}

/*
function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
      const [inter, argObj] = args
      if (!(property in argObj)) {
          throw new Error(`Property '${property}' does not exist on args.`);
      }
      return originalMethod.apply(this, args)
  }
  return descriptor
}
*/

export class Command {
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

  private static wrapper(target: any, name: string, description: string, settings: Discord.CommandSettings) {
    return (command: any) => {
      const cmdOptions: Discord.Configs['options'] = target.commandOptions
      const wrapper = cmdOptions && cmdOptions.get(name) || undefined
      let re = command
        .setName(name)
        .setDescription(description)
        .setRequired(settings.required || false)
      if (wrapper)
        re = wrapper(re)
      return re
    }
  }

  private static initOptions(name: string, type: Discord.SubCommandType, target: any) {
    const key = 'command:vars'
    const meta: Discord.SubCommandMeta[] = Reflect.getOwnMetadata(key, target) || []
    target.commandOptions = target.commandOptions || new Map<string, (config: any) => any>()
    target._lastOptionTarget = { name, type }

    meta.push(target._lastOptionTarget)
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

  public static addBooleanOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'boolean', target)
      Command.prepare(
        target,
        command => command.addBooleanOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addStringOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'string', target)
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
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'integer', target)
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
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'double', target)
      Command.prepare(
        target,
        command => command.addNumberOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addUserOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'user', target)
      Command.prepare(
        target,
        command => command.addUserOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addChannelOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'channel', target)
      Command.prepare(
        target,
        command => command.addChannelOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addRoleOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'role', target)
      Command.prepare(
        target,
        command => command.addRoleOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addAttachmentOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'attachment', target)
      Command.prepare(
        target,
        command => command.addAttachmentOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }

  public static addMentionableOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Command.initOptions(name, 'mentionable', target)
      Command.prepare(
        target,
        command => command.addMentionableOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }
}
