#!/usr/bin/env bun

import { Command } from 'commander'
import { registerGenerateTipsCommand } from './cli/command-generate-tips.ts'

export function createProgram(): Command {
  const program = new Command()

  program.name('sfp-image').description('Generate branded School for Professionals images from structured input.')
  registerGenerateTipsCommand(program)

  return program
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  await createProgram().parseAsync(argv)
}

function isCliEntrypoint(argv1: string | undefined = process.argv[1]): boolean {
  if (!argv1) {
    return false
  }

  return /\/cli\.(cjs|mjs|ts)$/.test(argv1.replaceAll('\\', '/'))
}

async function main(): Promise<void> {
  try {
    await runCli(process.argv)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(message)
    process.exitCode = 1
  }
}

if (isCliEntrypoint()) {
  main()
}
