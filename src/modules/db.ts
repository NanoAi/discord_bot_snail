import type { Document, Model } from 'mongoose'
import mongoose, { Schema } from 'mongoose'

// Define the UserData interface
interface UserData {
  roles: string[]
  warnings: string[]
  xp: number
}

// Define the Mongoose schema for a user document
const UserSchema = new Schema<UserData & Document>({
  _id: String, // Discord User ID
  roles: [String],
  warnings: [String],
  xp: { type: Number, default: 0 },
})

// Define the Guild Schema to handle user data per guild
const GuildSchema = new Schema<Document & { users: Record<string, UserData> }>({
  _id: String, // Guild ID
  users: { type: Map, of: UserSchema }, // User data mapped by Discord User ID
})

// Create the Mongoose model for the guild
const GuildModel: Model<Document & { users: Record<string, UserData> }> = mongoose.model('Guild', GuildSchema)

class MongoDBController {
  private queue: Promise<void>

  constructor(uri: string) {
    mongoose.connect(uri)
    this.queue = Promise.resolve()
  }

  private enqueueOperation(operation: () => Promise<void>): void {
    this.queue = this.queue.then(operation).catch(console.error)
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect()
  }

  public upsertUser(guildId: string, userId: string, roles: string[], xp: number = 0): void {
    this.enqueueOperation(async () => {
      await GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}`]: { roles, warnings: [], xp } } },
        { upsert: true },
      )
    })
  }

  public updateUserRoles(guildId: string, userId: string, roles: string[]): void {
    this.enqueueOperation(async () => {
      await GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}.roles`]: roles } },
      )
    })
  }

  public addWarning(guildId: string, userId: string, warning: string): void {
    this.enqueueOperation(async () => {
      await GuildModel.updateOne(
        { _id: guildId },
        { $push: { [`users.${userId}.warnings`]: warning } },
      )
    })
  }

  public updateXP(guildId: string, userId: string, xp: number): void {
    this.enqueueOperation(async () => {
      await GuildModel.updateOne(
        { _id: guildId },
        { $set: { [`users.${userId}.xp`]: xp } },
      )
    })
  }

  public async getUserData(guildId: string, userId: string): Promise<UserData | null> {
    return await this.queue.then(async () => {
      const guild = await GuildModel.findById(guildId).exec()
      return guild ? (guild.users as any).get(userId) || null : null
    }).catch(console.error)
  }
}

export default MongoDBController
