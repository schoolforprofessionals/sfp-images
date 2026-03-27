import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import satori, { init as initSatori } from 'satori/standalone'
import yogaWasm from 'satori/yoga.wasm'
import { createLoadedFontLoader } from './font-loader.ts'
import { fontSourceWorker } from './font-source-worker.ts'
import type { GenerateRuntime } from './generate-runtime.ts'

let initializationPromise: Promise<void> | undefined

function ensureWorkerRenderingInitialized(): Promise<void> {
  initializationPromise ??= Promise.all([initSatori(yogaWasm), initWasm(resvgWasm)]).then(() => undefined)

  return initializationPromise
}

export function generateRuntimeWorker({ fontSourcePath }: { fontSourcePath: string }): GenerateRuntime {
  return {
    loadFont: createLoadedFontLoader(() => fontSourceWorker(fontSourcePath)),
    renderPng: async (svg: string): Promise<Uint8Array> => {
      await ensureWorkerRenderingInitialized()

      const resvg = new Resvg(svg)

      return resvg.render().asPng()
    },
    renderSvg: async (element, options) => {
      await ensureWorkerRenderingInitialized()

      return satori(element, options)
    },
  }
}
