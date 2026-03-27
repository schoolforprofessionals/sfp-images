import { existsSync } from 'node:fs'

const builtPackageEntryUrl = new URL('../dist/index.mjs', import.meta.url)
const { getGenerateTipsConfig } = await import(builtPackageEntryUrl.href)
const generateTipsConfig = getGenerateTipsConfig('sfp')

if (!existsSync(generateTipsConfig.font.sourcePath)) {
  throw new Error(`Missing packaged font at ${generateTipsConfig.font.sourcePath}.`)
}
