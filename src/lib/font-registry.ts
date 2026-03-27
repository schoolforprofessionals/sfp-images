const ArchivoBlack: FontSpec = {
  family: 'Archivo Black',
  source: 'assets/fonts/ArchivoBlack-Regular.ttf',
}

export const fonts = { ArchivoBlack } as const

export type Font = keyof typeof fonts
export interface FontSpec {
  family: string
  source: string
}

export type ProjectFontSourcePath = (typeof fonts)[Font]['source']

const names = Object.keys(fonts).sort() as Font[]
export const fontRegistry = names.map((font) => fonts[font].source) as ProjectFontSourcePath[]
