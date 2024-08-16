import 'dotenv/config'
import * as process from 'node:process'

import { REST as DRestClient, Events, Routes } from 'discord.js'
import chalk from 'chalk'
import * as Discord from './modules/discord'
import { bindLogger, logger } from './modules/logger'
import declare from './modules/functions/declare'
import prisma from '~/modules/prisma'

console.log('~\nStarting...')
// Create a new client instance

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
Discord.Client.once(Events.ClientReady, (readyClient) => {
  console.log(chalk.gray('-'.repeat(process.stdout.columns)))
  console.log(`${chalk.green('✅ - Ready! Logged in as')} ${chalk.bold.blueBright(readyClient.user.tag)}`)
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

const sLog = (function (n) {
  return function (...args: any[]) {
    console.log(`[${n}] ${args.join(', ')}`)
    n += 1
    return n
  }
}(0))

;(async () => {
  try {
    sLog('Connecting to Database...')
    await prisma.$connect()
    await prisma.guild.findFirst()

    sLog('Loading Commands...')
    await declare('commands/*.ts')

    const commandCount = Discord.Commands.getMap().size
    sLog(`Started refreshing ${chalk.underline.bold(commandCount)} application (/) commands.`)

    // The put method is used to fully refresh all commands in the guild with the current set
    // Routes.applicationGuildCommands(env.appID, env.testServer)
    await rest.put(Routes.applicationCommands(env.appID), {
      body: Discord.Commands.getCommandsAsJson(),
    })

    sLog(`Successfully reloaded ${chalk.underline.bold(commandCount)} application (/) commands.`)

    sLog('Loading Events...')
    await declare('events/*.ts')
    sLog('Successfully bound all events.')

    Discord.Client.login(process.env.DISCORD_TOKEN)
  }
  catch (error) {
    // And of course, make sure you catch and log any errors!
    console.log(chalk.gray('-'.repeat(process.stdout.columns)))
    console.error(error)
  }
})()

// Log in to Discord with your client's token
// client.login(process.env.DISCORD_TOKEN)
