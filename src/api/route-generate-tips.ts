import { createRoute } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { type Label, labels } from '../labels.ts'
import type { GenerateTipsImageInput } from '../lib/generate-tips.tsx'

function parseGenerateTipsLabel(value: string | undefined): Label {
  const normalizedLabel = value?.trim().toLowerCase() ?? ''

  if (!labels.includes(normalizedLabel as Label)) {
    throw new Error(`Label must be one of: ${labels.join(', ')}.`)
  }

  return normalizedLabel as Label
}

function parseGenerateTipsQuery(context: Context): GenerateTipsImageInput {
  return {
    label: parseGenerateTipsLabel(context.req.query('label')),
    tips: context.req.queries('tip') ?? [],
    title: context.req.query('title') ?? '',
  }
}

function createGenerateTipsRouteHandler(generateTipsImage: (input: GenerateTipsImageInput) => Promise<Uint8Array>) {
  return async (context: Context) => {
    const pngBytes = await generateTipsImage(parseGenerateTipsQuery(context))
    const responseBytes = new Uint8Array(pngBytes.buffer as ArrayBuffer, pngBytes.byteOffset, pngBytes.byteLength)

    return new Response(responseBytes, {
      headers: {
        'Content-Type': 'image/png',
      },
      status: 200,
    })
  }
}

export const routeGenerateTips = {
  createHandler: createGenerateTipsRouteHandler,
  maxTipCount: 7,
  minTipCount: 3,
  route: createRoute({
    description: 'Generate a numbered tips image as a PNG.',
    method: 'get',
    path: '/api/generate-tips',
    responses: {
      200: {
        description: 'Generated tips image as PNG.',
      },
      400: {
        description: 'Invalid query parameters or image constraints.',
      },
      500: {
        description: 'Unexpected server error.',
      },
    },
    summary: 'Generate a numbered tips image.',
  }),
} as const
