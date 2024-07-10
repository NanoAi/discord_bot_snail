import 'dotenv/config'

import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js'
import { DiscordCommands, DiscordClient } from './class/discord'
import declare from './modules/declare'
import ora from 'ora'

// const spinner = ora('Starting...\n').start()
// Create a new client instance

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
DiscordClient.once(Events.ClientReady, (readyClient) => {
  // spinner.succeed(`Ready! Logged in as ${readyClient.user.tag}`)
})

DiscordClient.once(Events.Error, (error) => {
  // spinner.fail('Failed to start Discord Application.')
  throw error
})

const env = {
  token: process.env.DISCORD_TOKEN!,
  pubKey: process.env.PUBLIC_KEY!,
  appID: process.env.APP_ID!,
  testServer: process.env.TEST_SERVER!,
}

for (const [k, v] of Object.entries(env)) {
  if (!v) throw Error(`Unknown Discord "${k}".`)
}

const rest = new REST().setToken(env.token)

;(async () => {
  try {
    // spinner.text = 'Loading Commands...'
    await declare('commands/*.ts')

    const commandCount = DiscordCommands.getMap().size
    console.log(`Started refreshing ${commandCount} application (/) commands.`)

    // NOTE: This is a logger command.
    console.log(DiscordCommands.getCommandsAsJson())

    // The put method is used to fully refresh all commands in the guild with the current set
    await rest.put(Routes.applicationGuildCommands(env.appID, env.testServer), {
      body: DiscordCommands.getCommandsAsJson(),
    })

    console.log(`Successfully reloaded ${commandCount} application (/) commands.`)
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }

  DiscordClient.login(process.env.DISCORD_TOKEN)
})()

// Log in to Discord with your client's token
// client.login(process.env.DISCORD_TOKEN)
