import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'

export const routeIndex = {
  handler: (context: Context) => context.text('sfp-image', 200),
  route: createRoute({
    description: 'Return the API service identifier.',
    method: 'get',
    path: '/',
    responses: {
      200: {
        content: {
          'text/plain': {
            schema: z.string(),
          },
        },
        description: 'Plain-text service identifier.',
      },
    },
    summary: 'Return the service identifier.',
  }),
} as const
