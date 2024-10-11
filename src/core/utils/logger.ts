import type { Guild } from 'discord.js'
import fs from 'node:fs'
import dayjs from 'dayjs'
import { Events } from 'discord.js'
import { pino } from 'pino'
import pretty from 'pino-pretty'
import { ENV } from '~/index'
import * as Discord from '../discord'

function pinoPath() {
  return `logs/${dayjs(new Date()).format('YYYY-MM-DD')}.log`
}

const pinoPretty = pretty({
  colorize: true, // Colorize logs in console
  levelFirst: true, // Show level first in the log output
  translateTime: 'HH:MM:ss.l', // Human-readable timestamp
})

// Define the streams
const streams = [
  { level: 'info', stream: pinoPretty }, // Pretty print for info level and above to console
  { level: 'debug', stream: fs.createWriteStream(pinoPath(), { flags: 'a' }) }, // Debug level and above to file
]

// Create the logger with multi-stream
const _pino = pino(
  {
    level: 'debug', // Minimum log level
  },
  pino.multistream(streams),
)

function sendToSystem(guild: Guild, info: string, msg?: string) {
  const t = '```'
  const systemChannel = guild && guild.systemChannel
  if (systemChannel)
    systemChannel.send(`INFO <:info_snail:1276562523746865182> ${info}${t}${msg || 'undefined'}${t}`)
}

const pinoErrorBound = _pino.error.bind(_pino)
const pinoFatalBound = _pino.fatal.bind(_pino)

function catchError(obj: object, msg?: string, ...args: any[]): void {
  console.error(obj, msg, ...args)
  return pinoErrorBound(String(obj), msg, ...args)
}

function catchFatal(obj: object, msg?: string, ...args: any[]) {
  console.error(obj, msg, ...args)
  return pinoFatalBound(String(obj), msg, ...args)
}

function discordLog(guild: Guild, info: string, msg?: string) {
  sendToSystem(guild, info, msg)
  // return _pino.info.bind(_pino)(info, msg, ...args)
}

Reflect.defineProperty(_pino, 'discordLog', { value: discordLog, writable: false })
Reflect.defineProperty(_pino, 'catchError', { value: catchError, writable: false })
Reflect.defineProperty(_pino, 'catchFatal', { value: catchFatal, writable: false })
export const logger: pino.Logger & { catchError: typeof catchError, catchFatal: typeof catchFatal } = _pino as any

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
