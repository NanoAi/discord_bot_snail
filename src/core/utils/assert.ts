import type { InteractionInit } from '~/types/discord'
import { ok as assert } from 'node:assert/strict'
import { APIInteractionGuildMember, ChatInputCommandInteraction, Guild, GuildMember, Message, User } from 'discord.js'
import { logger } from './logger'

interface typeCheckSettings {
  check: (value: any) => boolean
  name: string
}

function instanceOfAPIInteractionGuildMember(object: any): object is APIInteractionGuildMember {
  return (object.permissions instanceof Permissions) && (object.user !== undefined)
}

export class CheckAs {
  static readonly Guild: Readonly<typeCheckSettings> = Object.freeze({
    check: (value: Guild) => (value && value instanceof Guild),
    name: 'Guild' as const,
  })

  static readonly GuildMember: Readonly<typeCheckSettings> = Object.freeze({
    check: (value: GuildMember) => (value && value instanceof GuildMember),
    name: 'GuildMember' as const,
  })

  static readonly GuildMemberAPI: Readonly<typeCheckSettings> = Object.freeze({
    check: (value: GuildMember) => {
      return (value && (value instanceof GuildMember || instanceOfAPIInteractionGuildMember(value)))
    },
    name: 'GuildMemberAPI' as const
  })

  static readonly User: Readonly<typeCheckSettings> = Object.freeze({
    check: (value: User) => (value && value instanceof User),
    name: 'User' as const,
  })

  static readonly InteractionInit: Readonly<typeCheckSettings> = Object.freeze({
    check: (value: InteractionInit) => {
      return !!(value && (value instanceof ChatInputCommandInteraction || value instanceof Message))
    },
    name: 'InteractionInitializer' as const,
  })
}

export function validateAs<T>(value: unknown, typeCheck: typeCheckSettings): Promise<NonNullable<T>> {
  return new Promise((resolve, reject) => {
    if (!typeCheck.check(value)) {
      const err = new Error(`Validation Failed: Expected an instance of "${typeCheck.name}".`)
      logger.error(err)
      reject(err)
    }
    resolve(value as NonNullable<T>)
  })
}

export function assertAs<T>(value: unknown, typeCheck: typeCheckSettings): NonNullable<T> {
  assert(value)
  if (!typeCheck.check(value))
    throw new Error(`Validation Failed: Expected an instance of "${typeCheck.name}".`)
  return value as NonNullable<T>
}

export function isDefinedAs<T>(value: unknown, typeCheck: typeCheckSettings): T | undefined {
  return typeCheck.check(value) ? value as T : undefined
}

export function expect<T>(value: unknown): NonNullable<T> {
  return (<T>value) as NonNullable<T>
}
