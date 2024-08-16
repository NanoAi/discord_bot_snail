import type { Guild, Ticket } from '@prisma/client'
import prisma from '../prisma'

// Function to create or update guild when bot joins
export async function upsertGuild(guildId: string, xpSystem: boolean): Promise<Guild> {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { xpSystem },
    create: { guildId, xpSystem: false, bans: [], mutes: [], tickets: [] as any },
  })
}

// Function to get guild by guildId
export async function getGuild(guildId: string): Promise<Guild | null> {
  return await prisma.guild.findUnique({
    where: { guildId },
  })
}

// Function to create a ticket
export async function createTicket(guildId: string, ticketTitle: string, ticketTag: string): Promise<Ticket> {
  return await prisma.ticket.create({
    data: { guildId, ticketTitle, ticketTag },
  })
}
