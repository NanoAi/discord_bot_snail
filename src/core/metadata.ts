import type { CommandSettings } from './discord'
import type { SubCommandMeta } from '~/types/discord'

const _M = {
  commands: new WeakMap<any, { name: string, description: string }>(),
  commandVars: new WeakMap<any, SubCommandMeta[]>(),
  subcommands: new WeakMap<any, string>(),
  settings: new WeakMap<any, CommandSettings[]>(),
}

export abstract class Metadata {
  public static commands = {
    set(key: WeakKey, value: { name: string, description: string }) {
      _M.commands.set(key, value)
    },
    get(key: WeakKey): { name: string, description: string } | undefined {
      return _M.commands.get(key)
    },
  }

  public static commandVars = {
    set(key: WeakKey, value: SubCommandMeta[]) {
      _M.commandVars.set(key, value)
    },
    get(key: WeakKey): SubCommandMeta[] | undefined {
      return _M.commandVars.get(key)
    },
  }

  public static subCommands = {
    set(key: WeakKey, value: string) {
      _M.subcommands.set(key, value)
    },
    get(key: WeakKey): string | undefined {
      return _M.subcommands.get(key)
    },
  }

  public static settings = {
    set(key: WeakKey, value: CommandSettings[]) {
      _M.settings.set(key, value)
    },
    get(key: WeakKey): CommandSettings[] | undefined {
      return _M.settings.get(key)
    },
  }
}
