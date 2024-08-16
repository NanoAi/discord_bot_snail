import { pino } from 'pino'
import { Events } from 'discord.js'
import dayjs from 'dayjs'
import * as Discord from './discord'

const pinoTransport = pino.transport({
  targets: [
    {
      level: 'trace',
      target: 'pino/file',
      options: { destination: `logs/${dayjs(new Date()).format('YYYY-MM-DD')}.log` },
    },
    {
      level: 'trace',
      target: 'pino-pretty',
      options: { destination: 1 },
    },
  ],
})

const _pino = pino({}, pinoTransport)
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

Reflect.defineProperty(_pino, 'catchError', { value: catchError, writable: false })
Reflect.defineProperty(_pino, 'catchFatal', { value: catchFatal, writable: false })
export const logger: pino.Logger & { catchError: typeof catchError, catchFatal: typeof catchFatal } = _pino as any

export function bindLogger() {
  const client = Discord.Client
  client.once(Events.ClientReady, readyClient => logger.info(`Logged in as ${readyClient.user.tag}`))

  // I honestly don't think this ever happens...
  client.on(Events.GuildUpdate, (oldGuild, newGuild) => {
    if (oldGuild.id !== newGuild.id)
      logger.info(`[${oldGuild.id}] => [${newGuild.id}]`)
  })

  client.on(Events.Debug, info => logger.debug(info))
  client.on(Events.Warn, info => logger.warn(info))
  client.on(Events.Error, error => logger.error(error))
}
