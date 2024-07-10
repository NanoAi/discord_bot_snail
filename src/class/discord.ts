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
  private static commandsAsJson: any[] = []

  public static prepare() {
    for (const command of this.commands.values()) {
      this.commandsAsJson.push(command.toJSON())
    }
  }

  public static getCommandsAsJson() {
    return this.commandsAsJson
  }

  public static getMap() {
    return this.commands
  }
}

export class DiscordClient {
  static client = new Client({ intents: [GatewayIntentBits.Guilds] })
}
