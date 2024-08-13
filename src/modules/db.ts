import * as process from 'node:process'
import type { Connection, Document, Model } from 'mongoose'
import mongoose, { Schema, connection } from 'mongoose'
import { logger } from './logger'

// Define the UserData interface
interface UserData {
  roles: string[]
  warnings: string[]
  lastMessage: number
  xp: number
}

// Define the Mongoose schema for a user document
const UserSchema = new Schema<UserData & Document>({
  _id: String, // Discord User ID
  roles: [String],
  warnings: [String],
  lastMessage: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
})

const path = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/'

// Define the Guild Schema to handle user data per guild
const GuildSchema = new Schema<Document & { users: Record<string, UserData> }>({
  _id: String, // Guild ID
  users: { type: Map, of: UserSchema }, // User data mapped by Discord User ID
})

// Create the Mongoose model for the guild
// const GuildModel: Model<Document & { users: Record<string, UserData> }> = mongoose.model('Guild', GuildSchema)

async function connectToServer(uri: string, database: string) {
  const state = mongoose.connection.readyState
  if (state === 99 || state === 0) {
    const mg = await mongoose.connect(uri).then((mg) => {
      logger.info(`[DB] Connected => ${uri}`)
      return mg
    })
    logger.info(`[DB] Changing Database => ${database}`)
    return mg.connection.useDb(database)
  }
  logger.info(`[DB] Changing Database => ${database}`)
  return mongoose.connection.useDb(database).asPromise()
}

class MongoDBController {
  private GuildModel!: Model<Document & { users: Record<string, UserData> }>
  private _connection: Promise<Connection>
  private queue: Promise<void>

  constructor(uri: string, database: string) {
    this._connection = connectToServer(uri, database)
    this.queue = Promise.resolve()

    this._connection.then((mongoose) => {
      this.GuildModel = mongoose.model('Guild', GuildSchema)
    }).catch((error) => {
      logger.fatal(error)
      process.exit(1)
    })
  }

  private enqueueOperation(operation: () => Promise<void>): void {
    this.queue = this.queue.then(operation).catch(logger.error)
  }

  public guildModel(): typeof this.GuildModel {
    return this.GuildModel
  }

  public connection(): Promise<Connection> {
    return this._connection
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect()
  }

  public upsertUser(guildId: string, userId: string, roles: string[] = [], xp: number = 0): void {
    this.enqueueOperation(async () => {
      await this.GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}`]: { roles, warnings: [], lastMessage: 0, xp } } },
        { upsert: true },
      )
    })
  }

  public updateUserRoles(guildId: string, userId: string, roles: string[]): void {
    this.enqueueOperation(async () => {
      await this.GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}.roles`]: roles } },
      )
    })
  }

  public addWarning(guildId: string, userId: string, warning: string): void {
    this.enqueueOperation(async () => {
      await this.GuildModel.updateOne(
        { _id: guildId },
        { $push: { [`users.${userId}.warnings`]: warning } },
      )
    })
  }

  public updateXP(guildId: string, userId: string, xp: number): void {
    this.enqueueOperation(async () => {
      await this.GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}.xp`]: xp } },
      )
    })
  }

  public async getUserData(guildId: string, userId: string): Promise<UserData | null> {
    return await this.queue.then(async () => {
      const guild = await this.GuildModel.findById(guildId).exec()
      return guild ? (guild.users as any).get(userId) || null : null
    }).catch(logger.error)
  }
}

export default new MongoDBController(path, 'guild')
