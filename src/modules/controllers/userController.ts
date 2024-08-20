import type { User } from '@prisma/client'
import prisma from '../utils/prisma'

class UserController {
  private guild: string
  private user: string
  private _where: { uuid: { guildId: string, userId: string } }

  constructor(guildId: string, userId: string) {
    this.guild = guildId
    this.user = userId
    this._where = { uuid: { guildId, userId } }
  }

  private get() {
    return { where: this._where, guild: this.guild, user: this.user }
  }

  static where(guildId: string, userId: string) {
    return new UserController(guildId, userId)
  }

  async upsertUser(roles: string[] = [], lastMessage?: Date, warnings: string[] = [], xp: number = 0): Promise<User> {
    const get = this.get()

    if (!lastMessage)
      lastMessage = new Date(0)

    return await prisma.user.upsert({
      where: get.where,
      update: { roles, lastMessage, warnings, xp },
      create: { userId: get.user, guildId: get.guild, roles, lastMessage, warnings, xp },
    })
  }

  async setLastMessage(lastMessage: Date): Promise<User> {
    const get = this.get()
    return await prisma.user.update({
      where: get.where,
      data: { lastMessage },
    })
  }

  async setRoles(roles: string[]) {
    const get = this.get()
    return await prisma.user.update({
      where: get.where,
      data: { roles },
    })
  }

  async addRole(role: string) {
    const get = this.get()
    const user = await prisma.user.findUnique({ where: get.where })

    if (!user)
      return { code: 0, user: undefined }

    const roles = user.roles
    if (!roles.includes(role))
      roles.push(role)
    else
      return { code: 1, user: undefined }

    const updatedUser = await prisma.user.update({
      where: get.where,
      data: { roles },
    })

    return { code: 2, user: updatedUser }
  }

  async addWarning(warning: string) {
    const get = this.get()
    const user = await prisma.user.findUnique({ where: get.where })

    if (!user)
      return undefined

    const warnings = user.warnings
    warnings.push(warning)

    return await prisma.user.update({
      where: get.where,
      data: { warnings },
    })
  }

  async getUser(): Promise<User | null> {
    const get = this.get()
    return await prisma.user.findUnique({
      where: get.where,
    })
  }
}

export default UserController
