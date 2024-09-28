import { extname, join, resolve } from 'node:path'
import { promises as fs } from 'node:fs'
import { pathToFileURL } from 'node:url'

async function getFiles(dir: string): Promise<string[]> {
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
