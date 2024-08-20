import type { Action, Case, Guild, Ticket } from '@prisma/client'
import { simpleID } from '../utils/nanoid'
import prisma from '../utils/prisma'

class GuildController {
  private guildId: string
  private caseId?: string

  constructor(guildId: string) {
    this.guildId = guildId
  }

  static where(guildId: string) {
    return new GuildController(guildId)
  }

  case(caseId: string) {
    this.caseId = caseId
    return this
  }

  // Create or update a Guild
  async upsertGuild(xpSystem: boolean = false): Promise<Guild> {
    return await prisma.guild.upsert({
      where: { guildId: this.guildId },
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
  async createCase(description: string): Promise<Case> {
    const caseId = simpleID()
    const output = await prisma.case.create({
      data: {
        guildId: this.guildId!,
        caseId,
        description,
      },
    })
    this.caseId = output.caseId
    return output
  }

  // Find a Case by caseId
  async findCase(caseId: string): Promise<Case | null> {
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
        caseId: this.caseId!,
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
  async createTicket(creatorId: string, ticketTitle: string, ticketTag: number): Promise<Ticket> {
    return await prisma.ticket.create({
      data: {
        guildId: this.guildId!,
        caseId: this.caseId!,
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
  async updateTicketStatus(newStatus: number) {
    return await prisma.ticket.updateMany({
      where: { guildId: this.guildId!, caseId: this.caseId! },
      data: { ticketTag: newStatus },
    })
  }
}

export default GuildController
