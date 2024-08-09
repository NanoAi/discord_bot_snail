import mongoose from 'mongoose'

export const authSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  pass: { type: String, required: true, unique: false },
  token: { type: String, required: false, unique: true },
}, { timestamps: true })

export const serverSchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true },
  server: { type: String, required: true, unique: false },
  user: { type: String, required: true, unique: false },
  roles: { type: String, required: true, unique: false },
  warnings: { type: String, required: false, unique: false },
  xp: { type: Number, required: true, unique: false },
}, { timestamps: true })

export const logSchema = {
  actions: new mongoose.Schema({
    index: { type: Number, required: true, unique: true },
    server: { type: String, required: true, unique: false },
    user: { type: String, required: true, unique: false },
    command: { type: String, required: false, unique: false },
    args: { type: String, required: false, unique: false },
  }, { timestamps: true }),
}
