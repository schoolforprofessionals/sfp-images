import { parse } from 'opentype.js'
import type { GenerateRuntimeFont } from './generate-runtime.ts'

type FontBytes = ArrayBuffer | ArrayBufferView

function toArrayBuffer(bytes: FontBytes): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) {
    return bytes
  }

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export function createLoadedFontLoader(
  loadFontBytes: () => Promise<FontBytes> | FontBytes,
): () => Promise<GenerateRuntimeFont> {
  let loadedFontPromise: Promise<GenerateRuntimeFont> | undefined

  return async () => {
    loadedFontPromise ??= Promise.resolve(loadFontBytes()).then((bytes) => {
      const arrayBuffer = toArrayBuffer(bytes)

      return {
        bytes: arrayBuffer,
        font: parse(arrayBuffer),
      }
    })

    return loadedFontPromise
  }
}
