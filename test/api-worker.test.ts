import { strict as assert } from 'node:assert'

const allowedCorsOrigin = 'https://allowed.example'
const configuredCorsOrigins = `${allowedCorsOrigin},https://other.example`
const disallowedCorsOrigin = 'https://blocked.example'
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

function createGenerateTipsQuery(entries: ReadonlyArray<readonly [string, string]>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of entries) {
    searchParams.append(key, value)
  }

  return `/api/generate-tips?${searchParams.toString()}`
}

function createWorkerDevProcess(port: number, corsOrigins?: string) {
  const workerArgs = [
    'bun',
    'x',
    'wrangler',
    'dev',
    '--config',
    './wrangler.jsonc',
    '--ip',
    '127.0.0.1',
    '--local',
    '--log-level',
    'error',
    '--port',
    String(port),
    '--show-interactive-dev-session',
    'false',
  ]

  if (corsOrigins) {
    workerArgs.push('--var', `CORS_ORIGINS:${corsOrigins}`)
  }

  return Bun.spawn(workerArgs, {
    stderr: 'ignore',
    stdout: 'ignore',
  })
}

function createWorkerPort(): number {
  return 40_000 + Math.floor(Math.random() * 10_000)
}

async function waitForWorkerReady(baseUrl: string, timeoutMilliseconds: number): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL('/', baseUrl), {
        signal: AbortSignal.timeout(500),
      })

      if (response.ok) {
        return
      }
    } catch {}

    await Bun.sleep(250)
  }

  throw new Error(`Timed out waiting for Wrangler dev to become ready at ${baseUrl}.`)
}

async function requestWorker(baseUrl: string, path: string, requestInit?: RequestInit): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    ...requestInit,
    signal: AbortSignal.timeout(30000),
  })
}

async function runWorkerSmokeTest(): Promise<void> {
  const workerPort = createWorkerPort()
  const baseUrl = `http://127.0.0.1:${workerPort}`
  const workerProcess = createWorkerDevProcess(workerPort)

  try {
    await waitForWorkerReady(baseUrl, 30000)

    const indexResponse = await requestWorker(baseUrl, '/', {
      headers: {
        Origin: allowedCorsOrigin,
      },
    })

    assert.equal(indexResponse.status, 200)
    assert.equal(indexResponse.headers.get('Access-Control-Allow-Origin'), null)
    assert.match(indexResponse.headers.get('content-type') ?? '', /text\/plain/)
    assert.equal(await indexResponse.text(), 'sfp-image')

    const openApiResponse = await requestWorker(baseUrl, '/api/openapi.json')
    const openApiDocument = (await openApiResponse.json()) as {
      openapi: string
      paths: {
        '/api/generate-tips': {
          get: {
            responses: {
              '200': {
                content: {
                  'image/png': {
                    schema: {
                      format: string
                      type: string
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    assert.equal(openApiResponse.status, 200)
    assert.match(openApiResponse.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(openApiDocument.openapi, '3.1.0')
    assert.deepEqual(openApiDocument.paths['/api/generate-tips'].get.responses['200'].content['image/png'].schema, {
      format: 'binary',
      type: 'string',
    })

    const generateTipsResponse = await requestWorker(
      baseUrl,
      createGenerateTipsQuery([
        ['label', 'sfp'],
        ['tip', 'Lead with clarity'],
        ['tip', 'Keep the copy short'],
        ['tip', 'Measure real text width'],
        ['tip', 'Render once to PNG'],
        ['title', 'This is a way to generate images'],
      ]),
    )
    const generateTipsBytes = new Uint8Array(await generateTipsResponse.arrayBuffer())

    assert.equal(generateTipsResponse.status, 200)
    assert.equal(generateTipsResponse.headers.get('content-type'), 'image/png')
    assert.deepEqual(Array.from(generateTipsBytes.slice(0, pngSignature.length)), pngSignature)
  } finally {
    workerProcess.kill()
    await workerProcess.exited
  }
}

async function runWorkerCorsSmokeTest(): Promise<void> {
  const workerPort = createWorkerPort()
  const baseUrl = `http://127.0.0.1:${workerPort}`
  const workerProcess = createWorkerDevProcess(workerPort, configuredCorsOrigins)

  try {
    await waitForWorkerReady(baseUrl, 30000)

    const allowedOriginResponse = await requestWorker(baseUrl, '/', {
      headers: {
        Origin: allowedCorsOrigin,
      },
    })

    assert.equal(allowedOriginResponse.status, 200)
    assert.equal(allowedOriginResponse.headers.get('Access-Control-Allow-Origin'), allowedCorsOrigin)

    const disallowedOriginResponse = await requestWorker(baseUrl, '/', {
      headers: {
        Origin: disallowedCorsOrigin,
      },
    })

    assert.equal(disallowedOriginResponse.status, 200)
    assert.equal(disallowedOriginResponse.headers.get('Access-Control-Allow-Origin'), null)

    const preflightResponse = await requestWorker(baseUrl, '/api/generate-tips', {
      headers: {
        'Access-Control-Request-Headers': 'x-custom-header, content-type',
        'Access-Control-Request-Method': 'GET',
        Origin: allowedCorsOrigin,
      },
      method: 'OPTIONS',
    })

    assert.equal(preflightResponse.status, 204)
    assert.equal(preflightResponse.headers.get('Access-Control-Allow-Headers'), 'x-custom-header,content-type')
    assert.equal(preflightResponse.headers.get('Access-Control-Allow-Methods'), 'GET,HEAD,PUT,POST,DELETE,PATCH')
    assert.equal(preflightResponse.headers.get('Access-Control-Allow-Origin'), allowedCorsOrigin)
  } finally {
    workerProcess.kill()
    await workerProcess.exited
  }
}

if (process.env.RUN_WORKER_TESTS === '1') {
  try {
    await runWorkerSmokeTest()
    await runWorkerCorsSmokeTest()
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
