import 'dotenv/config'
import * as process from 'node:process'

import { REST as DRestClient, Events, Routes } from 'discord.js'
import chalk from 'chalk'
import { Drizzle } from '@utils/drizzle'
import langConfig from '@utils/i18next.config'
import * as Discord from './modules/discord'
import { bindLogger, sLog } from './modules/utils/logger'
import declare from './modules/utils/declare'

// Cleanup Console.
console.log('\r\n'.repeat(12))
console.clear()
console.clear()

console.log('~\nStarting...')

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

bindLogger()

const env = {
  token: process.env.DISCORD_TOKEN!,
  pubKey: process.env.PUBLIC_KEY!,
  appID: process.env.APP_ID!,
  testServer: process.env.TEST_SERVER!,
}

for (const [k, v] of Object.entries(env)) {
  if (!v)
    throw new Error(`Unknown Discord "${k}".`)
}

Discord.Global.REST = new DRestClient().setToken(env.token)
const rest = Discord.Global.REST
const sourceDir = './src'

;(async () => {
  try {
    sLog('Initializing Language Settings...')
    await langConfig()

    sLog('Connecting to Database...')
    await Drizzle.version()

    sLog('Loading Commands...')
    // eslint-disable-next-line regexp/no-useless-escape
    await declare(sourceDir, /commands[\/\\][^.].+\.ts/)

    const commandCount = Discord.Commands.getMap().size
    sLog(`Started refreshing ${chalk.underline.bold(commandCount)} application (/) commands.`)
    // The put method is used to fully refresh all commands in the guild with the current set
    // Routes.applicationGuildCommands(env.appID, env.testServer)
    await rest.put(Routes.applicationCommands(env.appID), {
      body: Discord.Commands.getCommandsAsJson(),
    })
    sLog(`Successfully reloaded ${chalk.underline.bold(commandCount)} application (/) commands.`)

    sLog('Loading Events...')
    await declare(sourceDir, /events[/\\][^.].+\.ts/)
    sLog('Successfully bound all events.')

    Discord.Client.login(process.env.DISCORD_TOKEN)
  }
  catch (error) {
    console.log(chalk.gray('-'.repeat(process.stdout.columns)))
    console.error(error)
  }
})()

// Log in to Discord with your client's token
// client.login(process.env.DISCORD_TOKEN)
