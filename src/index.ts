import 'dotenv/config'
import * as process from 'node:process'

import { REST as DRestClient, Events, Routes } from 'discord.js'
import ora from 'ora'
import * as Discord from './class/discord'
import declare from './modules/declare'

// console.clear()
const spinner = ora('Starting...\n').start()
// Create a new client instance

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
Discord.Client.once(Events.ClientReady, (readyClient) => {
  spinner.succeed(`Ready! Logged in as ${readyClient.user.tag}`)
})

Discord.Client.once(Events.Error, (error) => {
  spinner.fail('Discord Application Closed.')
  throw error
})

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

const rest = new DRestClient().setToken(env.token)

;(async () => {
  try {
    spinner.text = 'Loading Commands...'
    await declare('commands/*.ts')

    const commandCount = Discord.Commands.getMap().size
    spinner.text = `Started refreshing ${commandCount} application (/) commands.`

    // The put method is used to fully refresh all commands in the guild with the current set
    await rest.put(Routes.applicationGuildCommands(env.appID, env.testServer), {
      body: Discord.Commands.getCommandsAsJson(),
    })

    spinner.text = `Successfully reloaded ${commandCount} application (/) commands.`
  }
  catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }

  Discord.Client.login(process.env.DISCORD_TOKEN)
})()

// Log in to Discord with your client's token
// client.login(process.env.DISCORD_TOKEN)
