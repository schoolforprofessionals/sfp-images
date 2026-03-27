import { expect, test } from 'bun:test'
import packageJson from '../package.json' with { type: 'json' }
import { createApiApp } from '../src/api/create-api-app.ts'
import { generateTipsImage } from '../src/index.ts'

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const { app } = createApiApp({
  apiVersion: packageJson.version,
  handlers: {
    generateTipsImage,
  },
})

function createGenerateTipsQuery(entries: ReadonlyArray<readonly [string, string]>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of entries) {
    searchParams.append(key, value)
  }

  return `/api/generate-tips?${searchParams.toString()}`
}

test('api docs route returns Swagger UI HTML', async () => {
  const response = await app.request('/api/docs')
  const responseText = await response.text()

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('text/html')
  expect(responseText).toContain('/api/openapi.json')
})

test('api generate-tips route rejects blank tips', async () => {
  const response = await app.request(
    createGenerateTipsQuery([
      ['label', 'sfp'],
      ['tip', 'One'],
      ['tip', ''],
      ['tip', 'Three'],
      ['title', 'Valid title'],
    ]),
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'Tips cannot be blank.',
  })
})

test('api generate-tips route rejects invalid labels', async () => {
  const response = await app.request(
    createGenerateTipsQuery([
      ['label', 'invalid'],
      ['tip', 'One'],
      ['tip', 'Two'],
      ['tip', 'Three'],
      ['title', 'Valid title'],
    ]),
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'Label must be one of: cvd, dga, dps, dst, sfp.',
  })
})

test('api generate-tips route rejects missing titles', async () => {
  const response = await app.request(
    createGenerateTipsQuery([
      ['label', 'sfp'],
      ['tip', 'One'],
      ['tip', 'Two'],
      ['tip', 'Three'],
    ]),
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'Title is required.',
  })
})

test('api generate-tips route rejects too few tips', async () => {
  const response = await app.request(
    createGenerateTipsQuery([
      ['label', 'sfp'],
      ['tip', 'One'],
      ['tip', 'Two'],
      ['title', 'Valid title'],
    ]),
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'Provide between 3 and 7 tips.',
  })
})

test('api generate-tips route returns PNG bytes', async () => {
  const response = await app.request(
    createGenerateTipsQuery([
      ['label', 'sfp'],
      ['tip', 'Lead with clarity'],
      ['tip', 'Keep the copy short'],
      ['tip', 'Measure real text width'],
      ['tip', 'Render once to PNG'],
      ['title', 'This is a way to generate images'],
    ]),
  )
  const responseBytes = new Uint8Array(await response.arrayBuffer())

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(Array.from(responseBytes.slice(0, pngSignature.length))).toEqual(pngSignature)
})

test('api index route returns sfp-image', async () => {
  const response = await app.request('/')

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('text/plain')
  await expect(response.text()).resolves.toBe('sfp-image')
})

test('api openapi route returns a patched OpenAPI document', async () => {
  const response = await app.request('/api/openapi.json')
  const document = await response.json()
  const generateTipsOperation = document.paths['/api/generate-tips'].get
  const tipParameter = generateTipsOperation.parameters.find((parameter: { name: string }) => parameter.name === 'tip')

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(document.openapi).toBe('3.1.0')
  expect(generateTipsOperation.responses['200'].content['image/png'].schema).toEqual({
    format: 'binary',
    type: 'string',
  })
  expect(tipParameter).toEqual({
    description: 'Add a tip. Repeat this parameter between 3 and 7 times.',
    explode: true,
    in: 'query',
    name: 'tip',
    required: true,
    schema: {
      items: {
        type: 'string',
      },
      maxItems: 7,
      minItems: 3,
      type: 'array',
    },
    style: 'form',
  })
})
