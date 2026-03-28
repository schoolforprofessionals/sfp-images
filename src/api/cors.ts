import { z } from 'zod'

const corsOriginSchema = z
  .string()
  .url()
  .transform((origin) => new URL(origin).origin)

export const corsOriginsSchema = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(corsOriginSchema).min(1))
  .transform((origins) => [...new Set(origins)].sort((a, b) => a.localeCompare(b)))

const optionalCorsOriginsSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  corsOriginsSchema.optional(),
)

export type CorsOrigins = z.infer<typeof corsOriginsSchema>

export function parseCorsOrigins(value: string | undefined): CorsOrigins | undefined {
  return optionalCorsOriginsSchema.parse(value)
}
