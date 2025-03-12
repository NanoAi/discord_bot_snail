import type { EscapeMarkdownOptions } from 'discord.js'
import { escapeMarkdown } from 'discord.js'

export class $f {
  public static escape(text: string, options?: EscapeMarkdownOptions) {
    return escapeMarkdown(text, options)
  }

  public static clear(text: string, options?: EscapeMarkdownOptions) {
    return escapeMarkdown(text, options).replaceAll(/\\+\W/g, '')
  }
}
