import { extname } from 'node:path'
import { glob } from 'glob'

export default async function declare(pattern: string): Promise<any[]> {
  try {
    const files = await glob(`./src/${pattern}`, {
      ignore: 'node_modules/**',
      withFileTypes: true,
    })

    const imports: any = files
      .filter(path => path.name !== 'example.ts')
      .filter(path => extname(path.name) === '.ts')
      .map(async (path) => {
        return await import(`file://${path.fullpath()}`)
      })

    return await Promise.all(imports)
  }
  catch (err) {
    console.error('Error importing files:', err)
  }
  throw new Error(`Couldn\'t import files in "${pattern}".`)
}
