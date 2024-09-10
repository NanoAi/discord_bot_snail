import { logger } from '@utils/logger'

if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject } as any
  }
  logger.warn(`
    Promise.withResolvers was not found in this version of NodeJS.
    Promise.withResolvers is available since version 22 of NodeJs.
    [[ Using Polyfill ]]
  `)
}

export default class Deferrer<T> {
  private _promise!: Promise<T>
  private _resolve!: (value?: any | PromiseLike<any>) => void
  private _reject!: (reason?: any) => any

  constructor() {
    const { promise, resolve, reject } = Promise.withResolvers<T>()
    this._promise = promise
    this._resolve = resolve
    this._reject = reject
  }

  public resolve(value?: T | PromiseLike<T>): Promise<T> {
    this._resolve(value)
    return this._promise
  }

  public reject(value?: any | PromiseLike<any>): Promise<T> {
    this._reject(value)
    return this._promise
  }

  public then(callback: (value: any) => any): any {
    return this._promise.then(callback)
  }

  public catch(callback: (value: any) => any) {
    return this._promise.catch(callback)
  }
}
