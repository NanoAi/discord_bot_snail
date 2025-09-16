import type { Client } from 'discord.js'
import { Events, ShardingManager } from 'discord.js'
import { ENV } from '~/index'
import { logger } from './utils/logger'

export class shardManager {
  manager = new ShardingManager('~/client', {
    // for ShardingManager options see:
    // https://discord.js.org/docs/packages/discord.js/14.18.0/ShardingManager:Class
    totalShards: 'auto',
    token: ENV.DISCORD_TOKEN,
  })

  constructor(client: Client) {
    client.on(Events.ShardReady, (id) => {
      console.log(`[SHARD][${id}] Ready.`)
    })

    client.on(Events.ShardError, (err) => {
      logger.error(err)
    })

    client.on(Events.ShardReconnecting, (id) => {
      console.log(`[SHARD][${id}] Reconnecting.`)
    })

    client.on(Events.ShardResume, (id, replays) => {
      console.log(`[SHARD][${id}] Event Replays: ${replays}`)
    })

    this.manager.on('shardCreate', (shard) => {
      console.log(`[SHARD][${shard.id}] Created.`)
    })

    return this
  }
}
