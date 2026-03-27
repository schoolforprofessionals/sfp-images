import { z } from 'zod'
import packageJson from '../../package.json' with { type: 'json' }
import { generateTipsImage } from '../lib/generate-tips-node.ts'
import { createApiApp } from './create-api-app.ts'

const apiPortSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? 3000 : value),
  z.coerce.number().int().positive(),
)

const { app } = createApiApp({
  apiVersion: packageJson.version,
  handlers: {
    generateTipsImage,
  },
})

export function createApiNode(port: number = apiPortSchema.parse(Bun.env.PORT)) {
  return {
    fetch: app.fetch,
    hostname: '0.0.0.0',
    port,
  } as const
}
