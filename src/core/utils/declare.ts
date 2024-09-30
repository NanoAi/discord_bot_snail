import { extname, join, resolve } from 'node:path'
import { promises as fs } from 'node:fs'
import { pathToFileURL } from 'node:url'
import NodeCache from 'node-cache'
import type { Maybe } from '~/types/util'

const fileCache = new NodeCache({ stdTTL: 24, checkperiod: 12 })

async function getFiles(dir: string): Promise<string[]> {
  const cache: Maybe<string[]> = fileCache.get(0)
  if (cache)
    return cache
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = join(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return Array.prototype.concat(...files)
}

export default async function declare(from: string, pattern: RegExp): Promise<any[]> {
  try {
    const files = await getFiles(from)
    fileCache.set(0, files)

    const filteredFiles = files
      .filter(path => pattern.test(path))
      .filter(path => !(/example\.ts$/).test(path))
      .filter(path => extname(path) === '.ts')

    const imports = filteredFiles.map(async (filePath) => {
      const absolutePath = resolve(filePath) // Resolve to absolute path
      return await import(pathToFileURL(absolutePath).toString()) // Convert path to file URL
    })

    return await Promise.all(imports)
  }
  catch (err) {
    console.error('Error importing files:', err)
  }
  throw new Error(`Couldn't import files in "${pattern}".`)
}

fileCache.on('expired', () => {
  fileCache.flushAll()
  fileCache.close()
})
