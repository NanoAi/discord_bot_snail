import * as process from 'node:process'
import chalk from 'chalk'

import { REST as DRestClient, Events, Routes } from 'discord.js'
import { Drizzle } from '~/core/utils/drizzle'
import langConfig from '~/core/utils/i18next.config'
import { ENV } from '.'
import * as Discord from './core/discord'
import declare from './core/utils/declare'
import { bindLogger, logger, sLog } from './core/utils/logger'

// Create a new client instance

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
Discord.Client.once(Events.ClientReady, async (readyClient) => {
  console.log(chalk.gray('-'.repeat(process.stdout.columns)))
  try {
    sLog('Synchronizing Commands to Client.')
    const syncResult = await Discord.Commands.syncCommands()
    sLog(`Found ${chalk.underline.bold(syncResult.found)} commands in Discord Cache.`)
    sLog(`Successfully synchronized ${chalk.underline.bold(syncResult.updated.length)} application (/) commands.`)
    console.log(chalk.gray('-'.repeat(process.stdout.columns)))
    console.log(`${chalk.green('✅ - Ready! Logged in as')} ${chalk.bold.blueBright(readyClient.user.tag)}`)
  }
  catch (error) {
    console.error(error)
    console.log(chalk.bold.bgRed('💀 - Forcing Shutdown.'))
    await readyClient.destroy()
  }
})

Discord.Client.once(Events.Error, (error) => {
  console.log(chalk.gray('-'.repeat(process.stdout.columns)))
  console.log(chalk.bold.bgRed('💀 - Discord Application Closed.'))
  throw error
})

Discord.Global.REST = new DRestClient().setToken(ENV.DISCORD_TOKEN)
const rest = Discord.Global.REST
const sourceDir = './src'

process.on('SIGINT', () => {
  if (!Discord.Client) {
    return process.exit()
  }
  Discord.Client.destroy().then(() => {
    logger.info('Client has shutdown via "SIGINT".')
    process.exit()
  }).catch(logger.catchError)
})

;(async () => {
  try {
    sLog('Initializing Language Settings...')
    await langConfig()

    bindLogger()

    sLog('Connecting to Database...')
    await Drizzle.version()

    sLog('Loading Commands...')
    await declare(sourceDir, /commands[/\\][^.].+\.ts/)

    const commandCount = Discord.Commands.getMap().size
    sLog(`Started refreshing ${chalk.underline.bold(commandCount)} application (/) commands.`)
    // The put method is used to fully refresh all commands in the guild with the current set
    // Routes.applicationGuildCommands(env.appID, env.testServer)
    await rest.put(Routes.applicationCommands(ENV.APP_ID), {
      body: Discord.Commands.getCommandsAsJson(),
    })
    sLog(`Successfully reloaded ${chalk.underline.bold(commandCount)} application (/) commands.`)

    sLog('Loading Events...')
    await declare(sourceDir, /events[/\\][^.].+\.ts/)
    sLog('Successfully bound all events.')

    Discord.Client.login(ENV.DISCORD_TOKEN)
  }
  catch (error) {
    console.log(chalk.gray('-'.repeat(process.stdout.columns)))
    console.error(error)
  }
})()

// Log in to Discord with your client's token
// client.login(process.env.DISCORD_TOKEN)
