import type { Font as OpenTypeFont } from 'opentype.js'
import type * as React from 'react'

export type GenerateRuntime = {
  loadFont: GenerateRuntimeFontLoader
  renderPng: GenerateRuntimePngRenderer
  renderSvg: GenerateRuntimeSvgRenderer
}

export type GenerateRuntimeFont = {
  bytes: ArrayBuffer
  font: OpenTypeFont
}

export type GenerateRuntimeFontLoader = () => Promise<GenerateRuntimeFont>

export type GenerateRuntimePngRenderer = (svg: string) => Promise<Uint8Array> | Uint8Array

export type GenerateRuntimeSvgRenderer = (
  element: React.ReactNode,
  options: GenerateRuntimeSvgRendererOptions,
) => Promise<string>

export type GenerateRuntimeSvgRendererOptions = {
  fonts: Array<{
    data: ArrayBuffer
    name: string
    style: 'italic' | 'normal'
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  }>
  height: number
  width: number
}
