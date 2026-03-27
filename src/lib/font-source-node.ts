import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_MANIFEST_FILE_NAME = 'package.json'

export function fontSourceNode(fontSourcePath: string, moduleImportMetaUrl: string): string {
  let directoryPath = dirname(fileURLToPath(moduleImportMetaUrl))

  while (true) {
    const candidatePath = join(directoryPath, fontSourcePath)

    if (existsSync(candidatePath)) {
      return candidatePath
    }

    const parentDirectoryPath = dirname(directoryPath)

    if (parentDirectoryPath === directoryPath || existsSync(join(directoryPath, PACKAGE_MANIFEST_FILE_NAME))) {
      break
    }

    directoryPath = parentDirectoryPath
  }

  throw new Error(`Could not locate ${fontSourcePath}.`)
}
