import NodeCache from 'node-cache'

interface CacheSettings {
  guildForumsTTL: number
  guildPermissionsTTL: number
  guildForumsCheckPeriod: number
  guildPermissionsCheckPeriod: number
}

export class SystemCache {
  private guildForums
  private guildPermissions
  private static instance: SystemCache
  private static settings: CacheSettings

  constructor(settings: CacheSettings) {
    this.guildForums = new NodeCache({
      stdTTL: settings.guildForumsTTL,
      checkperiod: settings.guildForumsCheckPeriod,
    })
    this.guildPermissions = new NodeCache({
      stdTTL: settings.guildPermissionsTTL,
      checkperiod: settings.guildPermissionsCheckPeriod,
    })
    return this
  }

  flushAll() {
    this.guildForums.flushAll()
    this.guildPermissions.flushAll()
  }

  getGuildForums() {
    return this.guildForums
  }

  getGuildPermissions() {
    return this.guildPermissions
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
