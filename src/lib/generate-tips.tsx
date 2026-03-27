import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { type Font, parse } from 'opentype.js'
import satori from 'satori'
import { type GenerateTipsLabel, getLabelConfig } from '../labels.ts'

const FONT_STYLE = 'normal'
const FONT_WEIGHT = 400
const MAX_TIP_COUNT = 7
const MIN_TIP_COUNT = 3

export const ImageConfig = {
  font: {
    family: 'Archivo Black',
    sourcePath: fileURLToPath(new URL('../../assets/fonts/ArchivoBlack-Regular.ttf', import.meta.url)),
  },
  image: {
    height: 432,
    width: 768,
  },
  layout: {
    barBadgeGap: 11,
    barBadgeOffsetLeft: 3,
    barBorderWidth: 1,
    barMaxWidth: 560,
    barRadius: 0,
    tipLineHeight: 1,
    tipTextPaddingRight: 17,
    titleFontSizeMax: 28,
    titleFontSizeMin: 14,
    titleLineHeight: 1.05,
    titleMaxWidth: 728,
    titleTopPadding: 44,
  },
} as const

const COUNT_LAYOUT_PRESETS = {
  3: {
    barGap: 26,
    barHeight: 41,
    barMinWidth: 422,
    tipFontSize: 18,
    titleToBarsGap: 55,
  },
  4: {
    barGap: 13,
    barHeight: 41,
    barMinWidth: 400,
    tipFontSize: 18,
    titleToBarsGap: 53,
  },
  5: {
    barGap: 13,
    barHeight: 40,
    barMinWidth: 412,
    tipFontSize: 17,
    titleToBarsGap: 41,
  },
  6: {
    barGap: 11,
    barHeight: 35,
    barMinWidth: 346,
    tipFontSize: 17,
    titleToBarsGap: 40,
  },
  7: {
    barGap: 9,
    barHeight: 31,
    barMinWidth: 306,
    tipFontSize: 17,
    titleToBarsGap: 29,
  },
} as const

type SupportedTipCount = keyof typeof COUNT_LAYOUT_PRESETS

type LoadedFont = {
  bytes: ArrayBuffer
  font: Font
}

export type GenerateTipsBarLayout = {
  number: string
  text: string
  width: number
}

export type GenerateTipsImageInput = {
  label: GenerateTipsLabel
  title: string
  tips: string[]
}

export type GenerateTipsLayout = {
  barBadgeSize: number
  barGap: number
  barHeight: number
  barWidth: number
  bars: GenerateTipsBarLayout[]
  numberFontSize: number
  tipFontSize: number
  titleFontSize: number
  titleLines: string[]
  titleToBarsGap: number
}

let loadedFontPromise: Promise<LoadedFont> | undefined

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function formatDisplayText(value: string): string {
  return collapseWhitespace(value).toLocaleUpperCase('nl-NL')
}

function normalizeGenerateTipsImageInput(input: GenerateTipsImageInput): GenerateTipsImageInput {
  return {
    label: input.label,
    tips: input.tips.map((tip) => formatDisplayText(tip)),
    title: formatDisplayText(input.title),
  }
}

function measureTextWidth(font: Font, text: string, fontSize: number): number {
  return font.getAdvanceWidth(text, fontSize)
}

function createTitleLayout(
  input: GenerateTipsImageInput,
  font: Font,
): {
  fontSize: number
  lines: string[]
} {
  if (!input.title) {
    throw new Error('Title is required.')
  }

  for (
    let fontSize = ImageConfig.layout.titleFontSizeMax;
    fontSize >= ImageConfig.layout.titleFontSizeMin;
    fontSize -= 1
  ) {
    if (measureTextWidth(font, input.title, fontSize) <= ImageConfig.layout.titleMaxWidth) {
      return {
        fontSize,
        lines: [input.title],
      }
    }
  }

  throw new Error('Title is too long to fit on a single line in the current layout.')
}

function createTipMeasurements(
  input: GenerateTipsImageInput,
  barBadgeSize: number,
  font: Font,
  layoutPreset: (typeof COUNT_LAYOUT_PRESETS)[SupportedTipCount],
): number[] {
  const maxTextWidth =
    ImageConfig.layout.barMaxWidth -
    ImageConfig.layout.barBorderWidth * 2 -
    ImageConfig.layout.barBadgeOffsetLeft -
    ImageConfig.layout.barBadgeGap -
    barBadgeSize -
    ImageConfig.layout.tipTextPaddingRight

  return input.tips.map((tip) => {
    if (!tip) {
      throw new Error('Tips cannot be blank.')
    }

    const width = measureTextWidth(font, tip, layoutPreset.tipFontSize)

    if (width > maxTextWidth) {
      throw new Error(`Tip "${tip}" is too long to fit on a single line in the current layout.`)
    }

    return width
  })
}

async function loadImageFont(): Promise<LoadedFont> {
  loadedFontPromise ??= (async () => {
    const bytes = await Bun.file(ImageConfig.font.sourcePath).arrayBuffer()

    return {
      bytes,
      font: parse(bytes),
    }
  })()

  return loadedFontPromise
}

function getCountLayoutPreset(tipCount: number): (typeof COUNT_LAYOUT_PRESETS)[SupportedTipCount] {
  const preset = COUNT_LAYOUT_PRESETS[tipCount as SupportedTipCount]

  if (!preset) {
    throw new Error(`Internal error: no layout preset for ${tipCount} tips.`)
  }

  return preset
}

function computeGenerateTipsLayoutWithFont(input: GenerateTipsImageInput, font: Font): GenerateTipsLayout {
  const normalizedInput = normalizeGenerateTipsImageInput(input)

  if (normalizedInput.tips.length < MIN_TIP_COUNT || normalizedInput.tips.length > MAX_TIP_COUNT) {
    throw new Error(`Provide between ${MIN_TIP_COUNT} and ${MAX_TIP_COUNT} tips.`)
  }

  const layoutPreset = getCountLayoutPreset(normalizedInput.tips.length)
  const barBadgeSize = Math.max(
    0,
    layoutPreset.barHeight - ImageConfig.layout.barBorderWidth * 2 - ImageConfig.layout.barBadgeOffsetLeft * 2,
  )
  const titleLayout = createTitleLayout(normalizedInput, font)
  const tipWidths = createTipMeasurements(normalizedInput, barBadgeSize, font, layoutPreset)
  const rawBarWidth =
    Math.max(...tipWidths) +
    ImageConfig.layout.barBorderWidth * 2 +
    ImageConfig.layout.barBadgeOffsetLeft +
    barBadgeSize +
    ImageConfig.layout.barBadgeGap +
    ImageConfig.layout.tipTextPaddingRight
  const barWidth = Math.min(ImageConfig.layout.barMaxWidth, Math.max(layoutPreset.barMinWidth, Math.ceil(rawBarWidth)))
  const numberFontSize = Math.max(14, Math.round(barBadgeSize * 0.68))
  const bars = normalizedInput.tips.map((tip, index) => ({
    number: String(index + 1),
    text: tip,
    width: barWidth,
  }))

  return {
    barBadgeSize,
    barGap: layoutPreset.barGap,
    barHeight: layoutPreset.barHeight,
    bars,
    barWidth,
    numberFontSize,
    tipFontSize: layoutPreset.tipFontSize,
    titleFontSize: titleLayout.fontSize,
    titleLines: titleLayout.lines,
    titleToBarsGap: layoutPreset.titleToBarsGap,
  }
}

export async function computeGenerateTipsLayout(input: GenerateTipsImageInput): Promise<GenerateTipsLayout> {
  const { font } = await loadImageFont()

  return computeGenerateTipsLayoutWithFont(input, font)
}

export async function generateTipsSvg(input: GenerateTipsImageInput): Promise<string> {
  const { bytes, font } = await loadImageFont()
  const colors = getLabelConfig(input.label).colors
  const layout = computeGenerateTipsLayoutWithFont(input, font)
  const titleLineEntries = layout.titleLines.map<{
    isOffset: boolean
    key: string
    line: string
  }>((line, index) => ({
    isOffset: index > 0,
    key: `${line}-${index}`,
    line,
  }))
  const styles = {
    bar: {
      alignItems: 'center',
      backgroundColor: colors.backgroundBar,
      border: `${ImageConfig.layout.barBorderWidth}px solid ${colors.colorTitle}`,
      borderRadius: ImageConfig.layout.barRadius,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      height: layout.barHeight,
      overflow: 'hidden',
      width: layout.barWidth,
    },
    barBody: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flex: 1,
      justifyContent: 'flex-start',
      paddingRight: ImageConfig.layout.tipTextPaddingRight,
    },
    barsArea: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      marginTop: layout.titleToBarsGap,
      width: ImageConfig.image.width,
    },
    barsFrame: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      width: layout.barWidth,
    },
    canvas: {
      alignItems: 'center',
      backgroundColor: colors.background,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      height: ImageConfig.image.height,
      width: ImageConfig.image.width,
    },
    numberBadge: {
      alignItems: 'center',
      backgroundColor: colors.backgroundNumber,
      color: colors.colorTitle,
      display: 'flex',
      fontSize: layout.numberFontSize,
      fontWeight: FONT_WEIGHT,
      height: layout.barBadgeSize,
      justifyContent: 'center',
      marginLeft: ImageConfig.layout.barBadgeOffsetLeft,
      width: layout.barBadgeSize,
    },
    tipText: {
      color: colors.colorText,
      fontSize: layout.tipFontSize,
      lineHeight: `${Math.ceil(layout.tipFontSize * ImageConfig.layout.tipLineHeight)}px`,
      textAlign: 'left',
      whiteSpace: 'nowrap',
      width: '100%',
    },
    title: {
      alignItems: 'center',
      boxSizing: 'border-box',
      color: colors.colorTitle,
      display: 'flex',
      flexDirection: 'column',
      fontSize: layout.titleFontSize,
      fontWeight: FONT_WEIGHT,
      justifyContent: 'center',
      lineHeight: `${Math.ceil(layout.titleFontSize * ImageConfig.layout.titleLineHeight)}px`,
      marginTop: ImageConfig.layout.titleTopPadding,
      maxWidth: ImageConfig.layout.titleMaxWidth,
      textAlign: 'center',
      width: ImageConfig.layout.titleMaxWidth,
    },
    titleLine: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 0,
      whiteSpace: 'nowrap',
      width: '100%',
    },
    titleLineOffset: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 2,
      whiteSpace: 'nowrap',
      width: '100%',
    },
  } as const

  return satori(
    <div style={styles.canvas}>
      <div style={styles.title}>
        {titleLineEntries.map((entry) => (
          <div key={entry.key} style={entry.isOffset ? styles.titleLineOffset : styles.titleLine}>
            {entry.line}
          </div>
        ))}
      </div>
      <div style={styles.barsArea}>
        <div style={styles.barsFrame}>
          {layout.bars.map((bar, index) => (
            <div
              key={`${bar.number}-${bar.text}`}
              style={{
                ...styles.bar,
                marginTop: index === 0 ? 0 : layout.barGap,
              }}
            >
              <div style={styles.numberBadge}>{bar.number}</div>
              <div style={styles.barBody}>
                <div
                  style={{
                    ...styles.tipText,
                    marginLeft: ImageConfig.layout.barBadgeGap,
                  }}
                >
                  {bar.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      fonts: [
        {
          data: bytes,
          name: ImageConfig.font.family,
          style: FONT_STYLE,
          weight: FONT_WEIGHT,
        },
      ],
      height: ImageConfig.image.height,
      width: ImageConfig.image.width,
    },
  )
}

export async function generateTipsImage(input: GenerateTipsImageInput): Promise<Uint8Array> {
  const svg = await generateTipsSvg(input)
  const resvg = new Resvg(svg)

  return resvg.render().asPng()
}
