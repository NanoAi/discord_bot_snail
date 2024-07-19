export function ToBoolean(value: string) {
  if (!value)
    return false
  if (value === '1' || value === 'y' || value.toLowerCase() === 'true')
    return true
  return false
}
