function emptyFunction() {}

export function getMethods(
  from: any,
  ignore?: string[],
  filterUnderscore?: boolean,
) {
  const output = new Map<string, any>()

  const props = Object.getOwnPropertyNames(from).filter((prop) => {
    const baseProps = Object.getOwnPropertyNames(emptyFunction).includes(prop)
    let pass = true
    if (ignore) {
      pass = !ignore.includes(prop)
    }
    if (filterUnderscore) {
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
