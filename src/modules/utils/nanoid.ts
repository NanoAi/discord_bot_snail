import { customAlphabet, nanoid } from 'nanoid'

export function simpleID() {
  const nano = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)
  return nano(5)
}
