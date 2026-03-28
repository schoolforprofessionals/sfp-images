import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import type { GenerateTipsImageInput } from '../lib/generate-tips.tsx'
import type { CorsOrigins } from './cors.ts'
import { API_DOCS_PATH, API_OPENAPI_PATH, buildApiOpenApiDocument } from './openapi.ts'
import { routeGenerateTips } from './route-generate-tips.ts'
import { routeIndex } from './route-index.ts'

export type ApiAppBindings = {
  corsOrigins?: CorsOrigins
}

export type CreateApiAppOptions = {
  apiVersion: string
  handlers: {
    generateTipsImage: (input: GenerateTipsImageInput) => Promise<Uint8Array>
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal Server Error'
}

function isApiClientError(error: Error): boolean {
  return (
    error.message.startsWith('Label must be one of:') ||
    error.message === `Provide between ${routeGenerateTips.minTipCount} and ${routeGenerateTips.maxTipCount} tips.` ||
    error.message === 'Tips cannot be blank.' ||
    error.message === 'Title is required.' ||
    error.message.includes('too long to fit on a single line')
  )
}

export function createApiApp({ apiVersion, handlers }: CreateApiAppOptions) {
  const app = new OpenAPIHono<{ Bindings: ApiAppBindings }>()

  app.onError((error, context) => {
    const message = getErrorMessage(error)
    const status = error instanceof Error && isApiClientError(error) ? 400 : 500

    if (status === 500) {
      console.error(error)
    }

    return context.json(
      {
        error: status === 400 ? message : 'Internal Server Error',
      },
      status,
    )
  })

  app.use('*', async (context, next) => {
    const corsOrigins = context.env?.corsOrigins

    if (!corsOrigins) {
      await next()
      return
    }

    return cors({ origin: corsOrigins })(context, next)
  })

  app.openapi(routeIndex.route, routeIndex.handler)

  app.get(API_DOCS_PATH, swaggerUI({ url: API_OPENAPI_PATH }))

  app.openapi(routeGenerateTips.route, routeGenerateTips.createHandler(handlers.generateTipsImage))

  app.get(API_OPENAPI_PATH, (context) => {
    return context.json(buildOpenApiDocument(), 200)
  })

  function buildOpenApiDocument() {
    return buildApiOpenApiDocument(app, apiVersion)
  }

  return {
    app,
  }
}
