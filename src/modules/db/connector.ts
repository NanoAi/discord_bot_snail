import process from 'node:process'
import assert from 'node:assert'
import mongoose from 'mongoose'
import type { Schema } from 'mongoose'
import { nanoid } from 'nanoid'
import { logger } from '../logger'
import { authSchema, logSchema } from './schema'

const url = process.env.DATABASE_URL

const dbKeys = {
  AUTH: { db: 'users', store: 'auths', schema: authSchema },
  ACTION: { db: 'logging', store: 'actions', schema: logSchema.actions },
}

interface IDBKey { db: string, store: string, schema: Schema }

interface ErrorCollection {
  errors: { [key: string]: Error }
  _message: string
}

interface IDBQueueObject {
  key: string
  calls: { self: ((v: any, id?: string) => Awaited<void>), error?: CallableFunction, id?: string, key: IDBKey }[]
}

const dbQueue: IDBQueueObject[] = [
  {
    key: 'users',
    calls: [],
  },
  {
    key: 'logging',
    calls: [],
  },
]

function dbConnect(uri: string, part: string) {
  const state = mongoose.connection.readyState
  if (state === 99 || state === 0) {
    return mongoose.connect(uri)
  }
  else {
    // console.log(`-> Changing DB... ${part}`)
    return mongoose.connection.useDb(part).asPromise()
  }
}

async function callWrapper(model: any, callback: any) {
  if (callback.error) {
    try {
      await callback.self(model, callback.id)
    }
    catch (reason) {
      const exception = reason as ErrorCollection
      let msg = exception._message

      if (exception.errors) {
        for (const v of Object.values(exception.errors)) {
          if (v.message)
            msg += `\n^- ${v.message}`
        }
      }

      logger.error(`${msg}`)
      await callback.error(exception)
    }
  }
  else {
    await callback.self(model, callback.id)
  }
}

async function dbProcess() {
  for (const [_, v] of Object.entries(dbQueue)) {
    if (v.calls.length > 0) {
      const uri = `${url}${v.key}`

      // console.log(`[db${v.key.toUpperCase()}] ${v.calls.length} ${v.key} requests in queue.`)
      await dbConnect(uri, v.key).then(async (db) => {
        while (v.calls.length > 0) {
          const callback = v.calls.pop()
          if (callback) {
            const key = callback.key
            const model = db.model(key.store, key.schema)
            callWrapper(model, callback)
          }
        }
      }).catch((reason) => {
        console.error(reason)
      })
      return
    }
  }
}

(function interval() {
  setTimeout(() => {
    dbProcess().then(() => {
      interval()
    })
  }, 1000)
})()

class DBCall {
  dbQueue: IDBQueueObject[]
  callback?: (model: mongoose.Model<any>, uuid?: string) => void
  errorCall?: CallableFunction

  constructor(dbQueue: IDBQueueObject[]) {
    this.dbQueue = dbQueue
    this.errorCall = undefined
    this.callback = undefined
  }

  catch(callback: (error: ErrorCollection) => void) {
    this.errorCall = callback
    return this
  }

  set(callback: (model: mongoose.Model<any>, uuid?: string) => void) {
    this.callback = callback
    return this
  }

  push(key: IDBKey, makeID: boolean) {
    this.dbQueue.forEach((v) => {
      const id = makeID ? nanoid() : undefined
      assert(this.callback !== undefined)
      if (v.key === key.db)
        v.calls.push({ self: this.callback, error: this.errorCall, id, key })
    })
  }
}

const dbCall = new DBCall(dbQueue)
export default { dbCall, key: dbKeys }
export { dbCall }
