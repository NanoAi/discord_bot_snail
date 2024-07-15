import 'reflect-metadata'
import type {
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from 'discord.js'

import getMethods from './method'
import Deferrer from '~/class/deferrer'
import * as Discord from '~/class/discord'

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
  'addBooleanOption' => [Function: addBooleanOption],
  'addUserOption' => [Function: addUserOption],
  'addChannelOption' => [Function: addChannelOption],
  'addRoleOption' => [Function: addRoleOption],
  'addAttachmentOption' => [Function: addAttachmentOption],
  'addMentionableOption' => [Function: addMentionableOption],
  'addStringOption' => [Function: addStringOption],
  'addIntegerOption' => [Function: addIntegerOption],
  'addNumberOption' => [Function: addNumberOption],
  '_sharedAddOptionMethod' => [Function: _sharedAddOptionMethod],
  'setName' => [Function: setName],
  'setDescription' => [Function: setDescription],
  'setNameLocalization' => [Function: setNameLocalization],
  'setNameLocalizations' => [Function: setNameLocalizations],
  'setDescriptionLocalization' => [Function: setDescriptionLocalization],
  'setDescriptionLocalizations' => [Function: setDescriptionLocalizations],
  'addSubcommandGroup' => [Function: addSubcommandGroup],
  'addSubcommand' => [Function: addSubcommand],
  'setDefaultPermission' => [Function: setDefaultPermission],
  'setDefaultMemberPermissions' => [Function: setDefaultMemberPermissions],
  'setDMPermission' => [Function: setDMPermission],
  'setNSFW' => [Function: setNSFW],
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

export class Options {
  private static main(target: any, name: string, config: any) {
    const vars: string[] = Reflect.getOwnMetadata('command:vars', target)
    if (!vars.includes(name))
      throw new Error(`The variable "${name}" is not defined in function "${target.name}".`)

    target.commandOptions.set(name, config)
  }

  public static string(config: Discord.Configs['SlashString'], name?: string) {
    return function (target: any, _context: any) {
      Options.main(target, name || target._lastOptionTarget, config)
    }
  }
}

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

  private static initOptions(name: string, target: any) {
    const key = 'command:vars'
    const meta: string[] = Reflect.getOwnMetadata(key, target) || []
    target.commandOptions = target.commandOptions || new Map<string, (config: any) => any>()
    target._lastOptionTarget = name

    meta.push(name)
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
      Command.initOptions(name, target)
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
      Command.initOptions(name, target)
      Command.prepare(
        target,
        command => command.addStringOption(Command.wrapper(target, name, description, settings)),
      )
    }
  }
}
