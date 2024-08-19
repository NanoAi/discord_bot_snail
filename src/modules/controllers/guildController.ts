import type { Guild, Ticket } from '@prisma/client'
import prisma from '../prisma'

export interface Punishment {
  issuer: string
  reason: string
  expiration: Date
}

class GuildController {
  private static empty = { create: [] }
  private guild?: string

  constructor() {}

  where(guild: string) {
    this.guild = guild
  }

  async upsertGuild(xpSystem: boolean = false) {
    const empty = GuildController.empty
    return await prisma.guild.upsert({
      where: { guildId: this.guild },
      update: { xpSystem },
      create: { guildId: this.guild!, xpSystem: false, bans: empty, mutes: empty, tickets: empty },
    })
  }

  async getGuild() {
    return await prisma.guild.findUnique({
      where: { guildId: this.guild! },
    })
  }

  async addTicket(creatorId: string, ticketTitle: string, ticketTag: string) {
    return await prisma.ticket.create({
      data: { guildId: this.guild!, creatorId, ticketTitle, ticketTag },
    })
  }
}

const guildController = new GuildController()
export default guildController
