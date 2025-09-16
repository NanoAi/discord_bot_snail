import type { Guild } from 'discord.js'
import fs from 'node:fs'
import dayjs from 'dayjs'
import { Events } from 'discord.js'
import pino from 'pino'
import pretty from 'pino-pretty'
import { ENV } from '~/index'
import * as Discord from '../discord'

function pinoPath() {
  return `logs/${dayjs(new Date()).format('YYYY-MM-DD')}.log`
}

// Transport pipeline
const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'HH:MM:ss.l',
      },
      level: 'info', // pretty print info+ to console
    },
    {
      target: 'pino/file',
      options: { destination: pinoPath(), mkdir: true },
      level: 'debug', // debug+ to file
    },
  ],
})

// Create the logger
const _pino = pino(
  {
    level: 'debug',
  },
  transport,
)

function sendToSystem(guild: Guild, info: string, msg?: string) {
  const t = '```'
  const systemChannel = guild?.systemChannel
  if (systemChannel)
    systemChannel.send(`INFO <:info_snail:1276562523746865182> ${info}${t}${msg || 'undefined'}${t}`)
}

const pinoErrorBound = _pino.error.bind(_pino)
const pinoFatalBound = _pino.fatal.bind(_pino)

function catchError(obj: object, msg?: string, ...args: any[]): void {
  console.error(obj, msg, ...args)
  return pinoErrorBound(obj, msg, ...args)
}

function catchFatal(obj: object, msg?: string, ...args: any[]) {
  console.error(obj, msg, ...args)
  return pinoFatalBound(obj, msg, ...args)
}

function discordLog(guild: Guild, info: string, msg?: string) {
  sendToSystem(guild, info, msg)
}

Reflect.defineProperty(_pino, 'discordLog', { value: discordLog, writable: false })
Reflect.defineProperty(_pino, 'catchError', { value: catchError, writable: false })
Reflect.defineProperty(_pino, 'catchFatal', { value: catchFatal, writable: false })

export const logger: pino.Logger & {
  discordLog: typeof discordLog
  catchError: typeof catchError
  catchFatal: typeof catchFatal
} = _pino as any

export function bindLogger() {
  const client = Discord.Client
  client.once(Events.ClientReady, (readyClient) => {
    logger.debug(`Logged in as ${readyClient.user.tag} in ${dayjs().diff(ENV.START_TIME, 'ms')}ms`)
  })
  client.on(Events.Debug, info => logger.debug(info))
  client.on(Events.Warn, info => logger.warn(info))
  client.on(Events.Error, error => logger.error(error))
}

export const sLog = (function (n) {
  return function (...args: any[]) {
    console.log(`[${n}] ${args.join(', ')}`)
    n += 1
    return n
  }
}(0))
