import packageJson from '../../package.json' with { type: 'json' }
import { generateTipsImage } from '../lib/generate-tips-worker.ts'
import { parseCorsOrigins } from './cors.ts'
import { createApiApp } from './create-api-app.ts'

const { app } = createApiApp({
  apiVersion: packageJson.version,
  handlers: {
    generateTipsImage,
  },
})

type ApiWorkerBindings = {
  CORS_ORIGINS?: string
}

export function createApiWorker() {
  return {
    fetch(request: Request, env: ApiWorkerBindings = {}) {
      const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS)

      return app.fetch(request, { corsOrigins })
    },
  }
}
