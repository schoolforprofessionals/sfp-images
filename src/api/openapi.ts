import type { OpenAPIHono } from '@hono/zod-openapi'
import { labels } from '../labels.ts'
import { routeGenerateTips } from './route-generate-tips.ts'

export const API_DOCS_PATH = '/api/docs'
export const API_OPENAPI_PATH = '/api/openapi.json'
export const API_TITLE = 'sfp-images API'

const errorSchema = {
  properties: {
    error: {
      type: 'string',
    },
  },
  required: ['error'],
  type: 'object',
} as const

type OpenApiDocument = ReturnType<OpenAPIHono['getOpenAPI31Document']>

function patchGenerateTipsOperation(document: OpenApiDocument): void {
  const generateTipsOperation = document.paths?.['/api/generate-tips']?.get

  if (!generateTipsOperation) {
    return
  }

  generateTipsOperation.parameters = [
    {
      description: `Use one of these label variants: ${labels.join(', ')}.`,
      in: 'query',
      name: 'label',
      required: true,
      schema: {
        enum: [...labels],
        type: 'string',
      },
    },
    {
      description: `Add a tip. Repeat this parameter between ${routeGenerateTips.minTipCount} and ${routeGenerateTips.maxTipCount} times.`,
      explode: true,
      in: 'query',
      name: 'tip',
      required: true,
      schema: {
        items: {
          type: 'string',
        },
        maxItems: routeGenerateTips.maxTipCount,
        minItems: routeGenerateTips.minTipCount,
        type: 'array',
      },
      style: 'form',
    },
    {
      description: 'Set the image title.',
      in: 'query',
      name: 'title',
      required: true,
      schema: {
        type: 'string',
      },
    },
  ]
  generateTipsOperation.responses = {
    ...generateTipsOperation.responses,
    200: {
      content: {
        'image/png': {
          schema: {
            format: 'binary',
            type: 'string',
          },
        },
      },
      description: 'Generated tips image as PNG.',
    },
    400: {
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
      description: 'Invalid query parameters or image constraints.',
    },
    500: {
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
      description: 'Unexpected server error.',
    },
  }
}

export function buildApiOpenApiDocument(
  app: Pick<OpenAPIHono, 'getOpenAPI31Document'>,
  apiVersion: string,
): OpenApiDocument {
  const document = app.getOpenAPI31Document({
    info: {
      title: API_TITLE,
      version: apiVersion,
    },
    openapi: '3.1.0',
  })

  patchGenerateTipsOperation(document)

  return document
}
