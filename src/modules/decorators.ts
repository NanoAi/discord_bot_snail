import 'reflect-metadata'
import type {
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

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
  public static string(config: Discord.Configs['SlashString']) {
    return function (target: any, _context: any) {
      Reflect.defineProperty(target, 'stringOptions', { value: config })
    }
  }

  public static subCommand(config: Discord.Configs['SlashSubCmd']) {
    return function (target: any, _context: any) {
      Reflect.defineProperty(target, 'subCommandWrapper', { value: config })
    }
  }
}

export class Mutators {
  private static prepare(
    target: any,
    mutator: (
      command: SlashCommandBuilder,
      ...args: any
    ) => SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder,
  ) {
    defer.then(() => {
      const parentMeta = Reflect.getMetadata('command', target.parent)
      const subCommand = Reflect.getMetadata('subcommand', target)
      const command = Discord.Commands.getMap().get(parentMeta.name)
      if (!command)
        throw new Error('A command was created but became undefined.')
      const mutation = mutator(command.data as SlashCommandBuilder)

      if (subCommand) {
        command.subcommands.set(subCommand, target)
      }

      Discord.Commands.getMap().set(parentMeta.name, {
        data: mutation,
        main: command.main,
        subcommands: command.subcommands,
      })
    })
  }

  // Currently this simply exposes the subcommand so that logic can be applied the old boring way.
  public static addSubCommand(name: string, description: string) {
    return function (target: any, _context: any) {
      Reflect.defineMetadata('subcommand', name, target)
      Mutators.prepare(
        target,
        (command) => {
          return command.addSubcommand((subcommand) => {
            let re = subcommand.setName(name).setDescription(description)
            if (target.subCommandWrapper) {
              re = target.subCommandWrapper(re)
            }
            return re
          })
        },
      )
    }
  }

  public static addBooleanOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Mutators.prepare(
        target,
        (command) => {
          return command.addBooleanOption(command =>
            command
              .setName(name)
              .setDescription(description)
              .setRequired(settings.required || false),
          )
        },
      )
    }
  }

  public static addStringOption(
    name: string,
    description: string,
    settings: Discord.CommandSettings = {},
  ) {
    return function (target: any, _context: any) {
      Mutators.prepare(
        target,
        (command) => {
          return command.addStringOption((command) => {
            let re = command
              .setName(name)
              .setDescription(description)
              .setRequired(settings.required || false)
            if (target.stringOptions)
              re = target.stringOptions(re)
            return re
          })
        },
      )
    }
  }
}
