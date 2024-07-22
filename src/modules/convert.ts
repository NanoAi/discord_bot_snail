import type { SubCommandType } from '~/class/discord'

export class Convert {
  public static ValueToType(value: string, type: SubCommandType) {
    switch (type) {
      case 'boolean':
        return this.Boolean(value)
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      default:
        break
    }
  }

  public static Boolean(value: string) {
    if (!value)
      return false

    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case '1':
        case 'y':
        case 'true':
          return true
        default:
          return false
      }
    }

    return Boolean(value)
  }
}
