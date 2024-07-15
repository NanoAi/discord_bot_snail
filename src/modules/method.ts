import 'reflect-metadata'

function emptyFunction() {}

export function getMethods(
  from: any,
  settings?: { filterUnderscore?: boolean, prototype?: boolean, ignore?: string[] },
) {
  const output = new Map<string, any>()

  if (!settings) {
    settings = {
      filterUnderscore: false,
      prototype: false,
      ignore: [],
    }
  }

  if (settings.prototype)
    from = from.prototype

  const props = Object.getOwnPropertyNames(from).filter((prop) => {
    const baseProps = Object.getOwnPropertyNames(emptyFunction).includes(prop)
    let pass = true
    if (settings.ignore) {
      pass = !settings.ignore.includes(prop)
    }
    if (settings.filterUnderscore) {
      pass = pass && !prop.startsWith('_')
    }
    return pass && !baseProps
  })

  for (const k of props) {
    const v = from[k]
    if (v)
      output.set(k, v)
  }

  return output
}

export default getMethods
