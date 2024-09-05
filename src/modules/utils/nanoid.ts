import { nanoid as _nanoid, customAlphabet } from 'nanoid'

class NanoID {
  public nanoid = _nanoid
  simple() {
    const nano = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)
    return nano(5)
  }
}

export const nanoid = new NanoID()
