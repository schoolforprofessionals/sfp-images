import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { createLoadedFontLoader } from './font-loader.ts'
import { fontSourceNode } from './font-source-node.ts'
import type { GenerateRuntime } from './generate-runtime.ts'

export function generateRuntimeNode({ fontSourcePath }: { fontSourcePath: string }): GenerateRuntime {
  return {
    loadFont: createLoadedFontLoader(() => Bun.file(fontSourceNode(fontSourcePath, import.meta.url)).arrayBuffer()),
    renderPng: (svg: string) => {
      const resvg = new Resvg(svg)

      return resvg.render().asPng()
    },
    renderSvg: async (element, options) => {
      return satori(element, options)
    },
  }
}
