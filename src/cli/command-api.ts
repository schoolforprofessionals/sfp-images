import type { Command } from 'commander'
import { createApiNode } from '../api/create-api-node.ts'

function startApiServer() {
  const server = Bun.serve(createApiNode())

  console.log(`Listening on http://localhost:${server.port}`)

  return server
}

export function registerApiCommand(program: Command): void {
  program
    .command('api')
    .description('Start the Hono API server.')
    .action(() => {
      startApiServer()
    })
}
