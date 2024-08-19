import type { Case, Guild, Punishment, Ticket } from '@prisma/client'
import prisma from '../prisma'

class GuildController {
  private guildId?: string

  where(guildId: string) {
    this.guildId = guildId
    return this
  }

  // Create or update a Guild
  async upsertGuild(xpSystem: boolean = false): Promise<Guild> {
    return await prisma.guild.upsert({
      where: { guildId: this.guildId! },
      update: { xpSystem },
      create: {
        guildId: this.guildId!,
        xpSystem,
      },
    })
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
    return await prisma.case.findFirst({
      where: { guildId: this.guildId, caseId },
    })
  }

  // Create a new Punishment (warn, ban, mute)
  async createPunishment(
    guildId: string,
    issuer: string,
    reason: string,
    expiration: Date,
    type: 'warns' | 'bans' | 'mutes',
  ): Promise<Punishment> {
    return await prisma.punishment.create({
      data: {
        guildId,
        issuer,
        reason,
        expiration,
      },
      include: {
        [type]: true,
      },
    })
  }

  // Create a new Ticket
  async createTicket(ticketId: number, creatorId: string, ticketTitle: string, ticketTag: string): Promise<Ticket> {
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
  async updateTicketStatus(ticketId: number, newStatus: string) {
    return await prisma.ticket.updateMany({
      where: { guildId: this.guildId!, ticketId },
      data: { ticketTag: newStatus },
    })
  }
}

const guildController = new GuildController()
export default guildController
