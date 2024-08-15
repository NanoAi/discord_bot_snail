import * as process from 'node:process'
import type { Connection, Document, Model } from 'mongoose'
import mongoose, { Schema } from 'mongoose'
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

// Create the Mongoose model for the guild
// const UserModel: Model<Document & { users: Record<string, UserData> }> = mongoose.model('Guild', GuildSchema)

async function connectToServer(uri: string, database: string) {
  const state = mongoose.connection.readyState
  if (state === 99 || state === 0) {
    logger.debug(`[DB] Attempting to Connect => ${uri} / ${database}`)
    const mg = await mongoose.connect(uri).catch(logger.bindError)
    if (mg && mg.connection) {
      const connection = mg.connection.useDb(database)
      logger.debug(`[DB] Connected => ${uri} / ${database}`)
      return connection
    }
    logger.error(`[DB] Could not connect to ${uri} / ${database}`)
  }
  return mongoose.connection.useDb(database)
}

class MongoDBController {
  private UserModel!: Model<Document & UserData>
  private _connection: Promise<Connection>
  private _guildId: string = ''
  private queue: Promise<void>

  constructor(uri: string, database: string) {
    this._connection = connectToServer(uri, database)
    this.queue = Promise.resolve()
  }

  private enqueueOperation(operation: () => Promise<void>): void {
    this.queue = this.queue.then(operation).catch(logger.bindError)
  }

  public async patch(guild: string): Promise<this> {
    this._guildId = guild
    const mongoose = await this._connection
    this.UserModel = mongoose.model(guild, UserSchema)
    return this
  }

  public connection(): Promise<Connection | void> {
    return this._connection
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect()
  }

  public upsertUser(userId: string, roles: string[] = [], xp: number = 0): void {
    this.enqueueOperation(async () => {
      await this.UserModel.updateOne(
        { _id: userId },
        { $set: { roles, warnings: [], lastMessage: 0, xp } },
        { upsert: true },
      )
    })
  }

  public updateUserRoles(userId: string, roles: string[]): void {
    this.enqueueOperation(async () => {
      await this.UserModel.updateOne(
        { _id: userId },
        { $set: { roles } },
      )
    })
  }

  public addWarning(userId: string, warning: string): void {
    this.enqueueOperation(async () => {
      await this.UserModel.updateOne(
        { _id: userId },
        { $push: { warnings: warning } },
      )
    })
  }

  public updateXP(userId: string, xp: number): void {
    this.enqueueOperation(async () => {
      await this.UserModel.updateOne(
        { _id: userId },
        { $set: { xp } },
      )
    })
  }

  public async getUserData(userId: string): Promise<UserData | null> {
    return await this.queue.then(async () => {
      const users = await this.UserModel.findById(this._guildId).exec()
      return users ? (users as any).get(userId) || null : null
    }).catch(logger.bindError)
  }
}

export default new MongoDBController(path, 'guild')
