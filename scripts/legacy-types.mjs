import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Retain declaration paths used by TypeScript's legacy node resolution.
export async function copyDeclarations(directory = 'dist') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await copyDeclarations(file)
    else if (file.endsWith('.d.cts')) {
      const content = await readFile(file, 'utf8')
      await writeFile(
        file.replace(/\.d\.cts$/, '.d.ts'),
        content.replace(/\.cjs(['"])/g, '$1').replace(/\/\/# sourceMappingURL=.*$/m, '')
      )
    }
  }
}
