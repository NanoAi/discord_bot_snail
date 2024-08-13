import { Events } from 'discord.js'
import { Client } from '~/modules/discord'
import MongoDBController from '~/modules/db'

Client.on(Events.GuildMemberAdd, async (member) => {
  // Do something on member join.
  console.log(member.displayName)
  MongoDBController.patch(member.guild.id).then(db => db.upsertUser(member.id))
})
