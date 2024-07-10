import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js'

export class DiscordCommands {
  private static commands = new Map<
    string,
    SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
  >()

  public static getCommandsAsJson() {
    const commandsAsJson: any[] = []
    for (const command of this.commands.values()) {
      commandsAsJson.push(command)
    }
    return commandsAsJson
  }

  public static getMap() {
    return this.commands
  }
}

export const DiscordClient = new Client({ intents: [GatewayIntentBits.Guilds] })
