import { strict as assert } from 'node:assert'

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const workerPort = 40_000 + Math.floor(Math.random() * 10_000)

function createGenerateTipsQuery(entries: ReadonlyArray<readonly [string, string]>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of entries) {
    searchParams.append(key, value)
  }

  return `/api/generate-tips?${searchParams.toString()}`
}

function createWorkerDevProcess() {
  return Bun.spawn(
    [
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
      String(workerPort),
      '--show-interactive-dev-session',
      'false',
    ],
    {
      stderr: 'ignore',
      stdout: 'ignore',
    },
  )
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

async function requestWorker(baseUrl: string, path: string): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(30000),
  })
}

async function runWorkerSmokeTest(): Promise<void> {
  const workerProcess = createWorkerDevProcess()
  const baseUrl = `http://127.0.0.1:${workerPort}`

  try {
    await waitForWorkerReady(baseUrl, 30000)

    const indexResponse = await requestWorker(baseUrl, '/')

    assert.equal(indexResponse.status, 200)
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

if (process.env.RUN_WORKER_TESTS === '1') {
  try {
    await runWorkerSmokeTest()
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
