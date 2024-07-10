import 'reflect-metadata'
import { SlashCommandBuilder } from 'discord.js'

import Deferrer from '~/class/deferrer'
import { DiscordCommands } from '~/class/discord'
import getMethods from './method'

const defer = new Deferrer()

export function SlashCommand(name: string, description: string) {
  return function (target: any, context: any) {
    const subcommands: { root: any; metadata: any }[] = []
    const metadata = { name, description }

    Reflect.defineMetadata('command', metadata, target)

    const methods = getMethods(target)
    methods.forEach((method) => {
      for (const k of Reflect.getMetadataKeys(method)) {
        const meta = Reflect.getMetadata(k, method)
        Reflect.defineProperty(method, 'parent', { value: target })
        subcommands.push({ root: method, metadata: meta })
      }
    })

    const command = new SlashCommandBuilder()
      .setName(metadata.name)
      .setDescription(metadata.description)

    DiscordCommands.getMap().set(metadata.name, command)

    defer.resolve().then(() => {
      DiscordCommands.prepare()
    })
  }
}

export function DefineCommand(name: string, description: string) {
  return function (target: Function, context: any) {
    Reflect.defineMetadata(`_cmd.${name}`, { name, description }, target)
  }
}

/**---
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

export class Mutators {
  public static addBooleanOption(
    name: string,
    description: string,
    required: boolean = false,
  ) {
    return function (target: any, context: any) {
      defer.then(() => {
        const parentMeta = Reflect.getMetadata('command', target.parent)
        const command = DiscordCommands.getMap().get(parentMeta.name)
        if (!command) throw new Error('A command was created but became undefined.')
        const mutation = command.addBooleanOption((command) =>
          command.setName(name).setDescription(description).setRequired(required),
        )
        DiscordCommands.getMap().set(parentMeta.name, mutation)
      })
    }
  }
}
