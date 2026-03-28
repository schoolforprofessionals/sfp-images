import { existsSync } from 'node:fs'

const builtPackageEntryUrl = new URL('../dist/index.mjs', import.meta.url)
const { ImageConfig } = await import(builtPackageEntryUrl.href)

if (!existsSync(ImageConfig.font.sourcePath)) {
  throw new Error(`Missing packaged font at ${ImageConfig.font.sourcePath}.`)
}
