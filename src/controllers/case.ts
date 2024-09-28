import { Action, Case, Ticket } from '@schema'
import { eq } from 'drizzle-orm'
import { Drizzle } from '~/core/utils/drizzle'

const db = Drizzle.db

// Controller class to handle case-related database operations
export class CaseDBController {
  // Create a new case
  async createCase(guildId: string, userId: string, description: string) {
    const caseId = await db.insert(Case).values({
      guildId,
      userId,
      description,
    }).returning({ id: Case.id })

    return `Case #${caseId} created successfully for User '${userId}' in Guild '${guildId}'!`
  }

  // Get a case by ID
  async getCaseById(caseId: number) {
    const caseRecord = await db.select().from(Case).where(eq(Case.id, caseId)).limit(1)
    if (!caseRecord || caseRecord.length === 0) {
      throw new Error(`Case #${caseId} not found.`)
    }
    return caseRecord[0]
  }

  // Update case description
  async updateCaseDescription(caseId: number, newDescription: string) {
    await db.update(Case)
      .set({ description: newDescription })
      .where(eq(Case.id, caseId))
    return `Case #${caseId} updated with new description!`
  }

  // Delete a case by ID
  async deleteCase(caseId: number) {
    await db.delete(Case).where(eq(Case.id, caseId))
    return `Case #${caseId} deleted successfully.`
  }

  // Add an action to a case
  async addActionToCase(caseId: number, actionType: string) {
    await db.insert(Action).values({
      caseId,
      actionType,
    })
    return `Action '${actionType}' added to Case #${caseId}!`
  }

  // Get actions for a specific case
  async getActionsByCase(caseId: number) {
    const actions = await db.select().from(Action).where(eq(Action.caseId, caseId))
    return actions
  }

  // Create a new ticket for a case
  async createTicket(caseId: number, issue: string, status: string) {
    await db.insert(Ticket).values({
      caseId,
      issue,
      status,
    })
    return `Ticket for issue '${issue}' created with status '${status}' in Case #${caseId}!`
  }

  // Get tickets for a specific case
  async getTicketsByCase(caseId: number) {
    const tickets = await db.select().from(Ticket).where(eq(Ticket.caseId, caseId))
    return tickets
  }

  // Get all cases for a specific guild
  async getCasesByGuild(guildId: string) {
    const cases = await db.select().from(Case).where(eq(Case.guildId, guildId))
    return cases
  }

  // Get all cases for a specific user
  async getCasesByUser(userId: string) {
    const cases = await db.select().from(Case).where(eq(Case.userId, userId))
    return cases
  }
}
