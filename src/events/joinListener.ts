import { Events } from 'discord.js'
import { Client } from '~/modules/discord'
import UserDBController from '~/modules/controllers/userController'

Client.on(Events.GuildMemberAdd, async (member) => {
  // Do something on member join.
  console.log(member.displayName)
  UserDBController.where(member.guild.id, member.id).upsertUser()
})
