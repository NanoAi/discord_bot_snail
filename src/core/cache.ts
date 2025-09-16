import NodeCache from 'node-cache'
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

interface CacheSettings {
  guildTTL: number
  guildCheckPeriod: number
}

export class SystemCache {
  private guildPermissions
  private guildSettings
  private static instance: SystemCache
  private static settings: CacheSettings

  constructor(settings: CacheSettings) {
    this.guildPermissions = new NodeCache({
      stdTTL: settings.guildTTL,
      checkperiod: settings.guildCheckPeriod,
    })
    this.guildSettings = new NodeCache({
      stdTTL: settings.guildTTL,
      checkperiod: settings.guildCheckPeriod
    })
    return this
  }

  flushAll() {
    this.guildPermissions.flushAll()
  }

  getGuildPermissions() {
    return this.guildPermissions
  }

  async getGuildSettings(guildId: string) {
    if ( this.guildSettings.has(guildId) ) {
      return this.guildSettings.get(guildId)
    }
    else {
      const filePath = join(process.cwd(), 'server-settings', `${guildId}.json`)
      try {
        const fileContent = await readFile(filePath, 'utf8')
        const data = JSON.parse(fileContent)
        this.guildSettings.set(guildId, data)
        return data
      } catch (err) {
        return false
      }
    }
  }

  async setGuildSettings(guildId: string, settings: any) {
    const data = JSON.stringify(settings)
    const filePath = join(process.cwd(), 'server-settings', `${guildId}.json`)
    await writeFile(filePath, data, 'utf8')
    this.guildSettings.set(guildId, data)
    return data
  }

  static getGlobalSettings() {
    return this.settings
  }

  static init(settings: CacheSettings) {
    SystemCache.instance = new SystemCache(settings)
    SystemCache.settings = settings
    return SystemCache.instance
  }

  static global() {
    return this.instance
  }
}
