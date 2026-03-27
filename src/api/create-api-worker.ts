import packageJson from '../../package.json' with { type: 'json' }
import { generateTipsImage } from '../lib/generate-tips-worker.ts'
import { createApiApp } from './create-api-app.ts'

const { app } = createApiApp({
  apiVersion: packageJson.version,
  handlers: {
    generateTipsImage,
  },
})

export function createApiWorker() {
  return {
    fetch(request: Request) {
      return app.fetch(request)
    },
  }
}
