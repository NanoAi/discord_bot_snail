import { Action, Case, CaseRelations, Ticket } from '@schema'
import { and, eq, gt, sql } from 'drizzle-orm'
import { Drizzle, Utils } from '~/core/utils/drizzle'
import { logger } from '~/core/utils/logger'
import type { ActionDB, CaseDB } from '~/types/controllers'

const db = Drizzle.db

function getEnumName(enumVar: typeof CaseDBController.ENUM.Ticket | typeof CaseDBController.ENUM.Action, value: number) {
  for (const [k, v] of Object.entries(enumVar)) {
    if (v === value)
      return k.toUpperCase()
  }
}

interface CaseData {
  action: ActionDB['select']
  case: CaseDB['select']
}

type CaseActionUnion = (CaseData['case'] & { actions: CaseData['action'][] })

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
      SOFTBAN: 4,
    },
  } as const

  private data: CaseData

  constructor(action: ActionDB['update'], caseVar: CaseDB['select']) {
    const actionInsert = {
      caseId: caseVar.id,
      actionType: action.actionType,
      reason: action.reason,
      userId: action.userId,
      actorId: action.actorId,
      timestamp: action.timestamp,
    } as ActionDB['select']
    this.data = {
      action: actionInsert,
      case: caseVar,
    }
    return this
  }

  static new(action: ActionDB['update'], caseVar: CaseDB['select']) {
    return new this(action, caseVar)
  }

  static enumTicket(e: number) {
    return getEnumName(this.ENUM.Ticket, e)
  }

  static enumAction(e: number) {
    return getEnumName(this.ENUM.Action, e)
  }

  // Create a new case
  static async createCase(guildId: string, userId: string, actorId: string, description: string) {
    const caseFiles = await db.insert(Case).values({
      guildId,
      userId,
      actorId,
      description,
    }).returning({ id: Case.id })

    const caseId = caseFiles[0].id

    logger.info(`Case #${caseId} created successfully for User '${userId}' in Guild '${guildId}'!`)
    return { id: caseId, guildId, userId, actorId, description }
  }

  static async upsertCase(caseId: number, guildId: string, userId: string, actorId: string, description: string) {
    let output
    if (caseId > 0) {
      output = await this.getCaseById(caseId)
      if (output && output.userId === userId) {
        const caseUpdate = await db.update(Case).set({
          id: output.id,
          guildId,
          userId,
          actorId,
          description,
        }).where(eq(Case.id, caseId)).returning()
        return caseUpdate[0]
      }
    }
    return this.createCase(guildId, userId, actorId, description)
  }

  static async updateCase(caseId: number, guildId: string, actorId?: string, description?: string) {
    const caseFile = await this.getCaseById(caseId)

    if (!caseFile)
      return undefined

    if (caseFile.guildId !== guildId)
      return undefined

    const caseUpdate = await db.update(Case).set({
      actorId: actorId || caseFile.actorId,
      description: description || caseFile.description,
    }).where(and(eq(Case.id, caseId), eq(Case.guildId, guildId))).returning()

    return caseUpdate && caseUpdate.length > 0 ? caseUpdate[0] : undefined
  }

  // Get a case by ID
  static async getCaseById(caseId: number) {
    const caseRecord = await db.select().from(Case).where(eq(Case.id, caseId)).limit(1)
    return (caseRecord && caseRecord.length > 0) && caseRecord[0] || undefined
  }

  // Update case description
  async updateCaseDescription(newDescription: string) {
    await db.update(Case)
      .set({ description: newDescription })
      .where(eq(Case.id, this.data.case.id))
    return `Case #${this.data.case.id} updated with new description!`
  }

  // Delete a case by ID
  async deleteCase() {
    await db.delete(Case).where(eq(Case.id, this.data.case.id))
    return `Case #${this.data.case.id} deleted successfully.`
  }

  // Add an action to a case
  async upsertAction() {
    const _G = CaseDBController

    const re = this.data
    if (typeof re.case.id !== 'number')
      throw new Error(`Expected a valid Number in \`data.case.id\` got ${re.case.id}(${typeof re.case.id}).`)

    await db.insert(Action).values({
      caseId: re.case.id,
      actionType: re.action.actionType,
      userId: re.action.userId,
      actorId: re.action.actorId,
      reason: re.action.reason,
    }).onConflictDoUpdate({
      target: Action.id,
      set: {
        actionType: re.action.actionType,
        reason: re.action.reason,
        userId: re.action.userId,
        actorId: re.action.actorId,
      },
      setWhere: sql`public."Action"."caseId" = ${re.case.id}`,
    })

    const enumInfo = `'TYPE:${getEnumName(_G.ENUM.Action, re.action.actionType)}(${re.action.actionType})'`
    logger.info(`Action ${enumInfo} added to Case '#${re.case.id}'!`)
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
  static async getCasesByUser(userId: string, from: number = 0): Promise<CaseActionUnion[]> {
    const cases = await db.query.Case.findMany({
      where: and(eq(Case.userId, userId), gt(Case.id, from)),
      with: {
        actions: true,
      },
      limit: 5,
    })
    return cases.sort((a, b) => +(a.id > b.id) || -(a.id < b.id))
  }
}
