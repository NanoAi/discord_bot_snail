import { Action, Case, Ticket } from '@schema'
import { eq } from 'drizzle-orm'
import { Drizzle } from '~/core/utils/drizzle'
import { logger } from '~/core/utils/logger'
import type { ActionDB, CaseDB } from '~/types/controllers'

const db = Drizzle.db

// Controller class to handle case-related database operations
export class CaseDBController {
  public static ENUM = {
    Ticket: {
      OPEN: 0,
      CLOSED: 1,
      PENDING: 2,
    },
    Action: {
      KICK: 0,
      BAN: 1,
      WARN: 2,
      MUTE: 3,
    },
  } as const

  private data: {
    action: ActionDB['select']
    case: CaseDB['select']
  }

  constructor(action: ActionDB['update'], actionCase: CaseDB['select']) {
    const actionInsert = {
      caseId: actionCase.id,
      actionType: action.actionType,
      reason: action.reason,
      timestamp: action.timestamp,
    } as ActionDB['select']
    this.data = {
      action: actionInsert,
      case: actionCase,
    }
    return this
  }

  // Create a new case
  static async createCase(guildId: string, userId: string, description: string) {
    const caseId = (await db.insert(Case).values({
      guildId,
      userId,
      description,
    }).returning({ id: Case.id }))[0].id
    logger.info(`Case #${caseId} created successfully for User '${userId}' in Guild '${guildId}'!`)
    return { id: caseId, guildId, userId, description } as CaseDB['insert']
  }

  // Get a case by ID
  static async getCaseById(caseId: number) {
    const caseRecord = await db.select().from(Case).where(eq(Case.id, caseId)).limit(1)
    if (!caseRecord || caseRecord.length === 0) {
      throw new Error(`Case #${caseId} not found.`)
    }
    return caseRecord[0]
  }

  // Update case description
  static async updateCaseDescription(caseId: number, newDescription: string) {
    await db.update(Case)
      .set({ description: newDescription })
      .where(eq(Case.id, caseId))
    return `Case #${caseId} updated with new description!`
  }

  // Delete a case by ID
  static async deleteCase(caseId: number) {
    await db.delete(Case).where(eq(Case.id, caseId))
    return `Case #${caseId} deleted successfully.`
  }

  // Add an action to a case
  static async addCase(caseFile: CaseDBController) {
    const re = caseFile.data
    await db.insert(Action).values({
      caseId: re.case.id,
      actionType: re.action.actionType,
      reason: re.action.reason,
    })
    logger.info(`Action '${re.action.actionType}' added to Case #${re.case.id}!`)
  }

  // Get actions for a specific case
  static async getActionsByCase(caseId: number) {
    const actions = await db.select().from(Action).where(eq(Action.caseId, caseId))
    return actions
  }

  // Create a new ticket for a case
  static async createTicket(caseId: number, issue: string, status: number) {
    await db.insert(Ticket).values({
      caseId,
      issue,
      status,
    })
    return `Ticket for issue '${issue}' created with status '${status}' in Case #${caseId}!`
  }

  // Get tickets for a specific case
  static async getTicketsByCase(caseId: number) {
    const tickets = await db.select().from(Ticket).where(eq(Ticket.caseId, caseId))
    return tickets
  }

  // Get all cases for a specific guild
  static async getCasesByGuild(guildId: string) {
    const cases = await db.select().from(Case).where(eq(Case.guildId, guildId))
    return cases
  }

  // Get all cases for a specific user
  static async getCasesByUser(userId: string) {
    const cases = await db.select().from(Case).where(eq(Case.userId, userId))
    return cases
  }
}
