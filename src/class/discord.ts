import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js'

export const DiscordClient = new Client({ intents: [GatewayIntentBits.Guilds] })
export type DiscordInteraction = Interaction<CacheType>
export type DiscordChatInteraction = ChatInputCommandInteraction<CacheType>

export class DiscordCommands {
  private static commands = new Map<
    string,
    {
      data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
      exec?: (interaction: Interaction<CacheType>) => void
    }
  >()

  public static getCommandsAsJson() {
    const commandsAsJson: any[] = []
    for (const command of this.commands.values()) {
      commandsAsJson.push(command.data.toJSON())
    }
    return commandsAsJson
  }

  public static getCommand(command: string) {
    return this.commands.get(command)
  }

  public static getMap() {
    return this.commands
  }
}

DiscordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  const command = DiscordCommands.getCommand(interaction.commandName)
  if (command && command.exec) {
    command.exec(interaction)
  }
})
