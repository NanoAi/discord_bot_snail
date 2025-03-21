import type { APIInteractionGuildMember } from 'discord.js'
import type { CaseDB } from '~/types/controllers'
import type { InteractionInit } from '~/types/discord'
import { ok as assert } from 'node:assert/strict'
import { ChatInputCommandInteraction, Guild, GuildMember, Message, User } from 'discord.js'
import { logger } from './logger'

interface checkAsType {
  check: (value: any) => boolean
  name: string
}

function isAPIInteractionGuildMember(object: any): object is APIInteractionGuildMember {
  return (object.permissions instanceof Permissions) && (object.user !== undefined)
}

function isCaseDBSelect(object: any): object is CaseDB['select'] {
  return (typeof object.id === 'number' && typeof object.description === 'string')
}

export class CheckAs {
  static readonly Guild: Readonly<checkAsType> = Object.freeze({
    check: (value: Guild) => (value && value instanceof Guild),
    name: 'Guild' as const,
  })

  static readonly GuildMember: Readonly<checkAsType> = Object.freeze({
    check: (value: GuildMember) => (value && value instanceof GuildMember),
    name: 'GuildMember' as const,
  })

  static readonly GuildMemberAPI: Readonly<checkAsType> = Object.freeze({
    check: (value: GuildMember) => {
      return (value && (value instanceof GuildMember || isAPIInteractionGuildMember(value)))
    },
    name: 'GuildMemberAPI' as const,
  })

  static readonly User: Readonly<checkAsType> = Object.freeze({
    check: (value: User) => (value && value instanceof User),
    name: 'User' as const,
  })

  static readonly Message: Readonly<checkAsType> = Object.freeze({
    check: (value: Message) => (value && value instanceof Message),
    name: 'Message' as const,
  })

  static readonly InteractionInit: Readonly<checkAsType> = Object.freeze({
    check: (value: InteractionInit) => {
      return !!(value && (value instanceof ChatInputCommandInteraction || value instanceof Message))
    },
    name: 'InteractionInitializer' as const,
  })

  static readonly CaseDBSelect: Readonly<checkAsType> = Object.freeze({
    check: (value: CaseDB['select']) => (value && isCaseDBSelect(value)),
    name: 'CaseDBSelect' as const,
  })
}

export function validateAs<T>(value: unknown, typeCheck: checkAsType): Promise<NonNullable<T>> {
  return new Promise((resolve, reject) => {
    if (!typeCheck.check(value)) {
      const err = new Error(`Validation Failed: Expected an instance of "${typeCheck.name}".`)
      logger.error(err)
      reject(err)
    }
    resolve(value as NonNullable<T>)
  })
}

export function assertAs<T>(value: unknown, typeCheck: checkAsType): NonNullable<T> {
  assert(value)
  if (!typeCheck.check(value))
    throw new Error(`Validation Failed: Expected an instance of "${typeCheck.name}".`)
  return value as NonNullable<T>
}

export function isDefinedAs<T>(value: unknown, typeCheck: checkAsType): T | undefined {
  return typeCheck.check(value) ? value as T : undefined
}

export function expect<T>(value: unknown): NonNullable<T> {
  return (<T>value) as NonNullable<T>
}
