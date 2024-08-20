import type { Action, Case, Guild, Ticket } from '@prisma/client'
import prisma from '../prisma'

class GuildController {
  private guildId?: string

  private assert() {
    if (!this.guildId)
      throw new Error('`guildId` not defined.')
    return this.guildId
  }

  guild(guildId: string) {
    this.guildId = guildId
    this.assert()
    return this
  }

  // Create or update a Guild
  async upsertGuild(xpSystem: boolean = false): Promise<Guild> {
    const guildId = this.assert()
    return await prisma.guild.upsert({
      where: { guildId },
      update: { xpSystem },
      create: {
        guildId: this.guildId!,
        cases: { create: [] },
        xpSystem,
      },
    })
  }

  async dropGuild() {
    return await prisma.guild.delete({ where: { guildId: this.guildId! } })
  }

  // Find a Guild by guildId
  async findGuild(): Promise<Guild | null> {
    return await prisma.guild.findUnique({
      where: { guildId: this.guildId! },
    })
  }

  // Create a new Case
  async createCase(caseId: number, description: string): Promise<Case> {
    return await prisma.case.create({
      data: {
        guildId: this.guildId!,
        caseId,
        description,
      },
    })
  }

  // Find a Case by caseId
  async findCase(caseId: number): Promise<Case | null> {
    return await prisma.case.findUnique({
      where: { uuid: { guildId: this.guildId!, caseId } },
    })
  }

  // Create an action in memory. (warn, ban, mute)
  async addAction(
    type: 'warn' | 'ban' | 'mute',
    issuer: string,
    reason: string,
    expiration: Date,
  ): Promise<Action> {
    return await prisma.action.create({
      data: {
        guildId: this.guildId!,
        issuer,
        reason,
        expiration,
      },
      include: {
        [`${type}s`]: true,
      },
    })
  }

  // Create a new Ticket
  async createTicket(ticketId: number, creatorId: string, ticketTitle: string, ticketTag: number): Promise<Ticket> {
    return await prisma.ticket.create({
      data: {
        guildId: this.guildId!,
        ticketId,
        creatorId,
        ticketTitle,
        ticketTag,
      },
    })
  }

  // Find all Tickets for a guild
  async findTickets(guildId: string): Promise<Ticket[]> {
    return await prisma.ticket.findMany({
      where: { guildId },
    })
  }

  // Update a Ticket's status
  async updateTicketStatus(ticketId: number, newStatus: number) {
    return await prisma.ticket.updateMany({
      where: { guildId: this.guildId!, ticketId },
      data: { ticketTag: newStatus },
    })
  }
}

const guildController = new GuildController()
export default guildController
