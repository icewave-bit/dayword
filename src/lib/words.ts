import type { Locale } from './i18n'

const EN_4 = [
  'PLAY',
  'WORD',
  'GAME',
  'FIVE',
  'CODE',
  'LIFE',
  'TIME',
  'WORK',
  'HOME',
  'TEAM',
  'DATA',
  'NODE',
  'SHIP',
  'STAR',
  'MOON',
  'TREE',
  'FIRE',
  'WIND',
  'RAIN',
  'GOLD',
  'SILK',
  'BIRD',
  'FISH',
  'CAKE',
  'DESK',
]

const EN_5 = [
  'APPLE',
  'BRICK',
  'CLOUD',
  'DREAM',
  'EAGER',
  'FAITH',
  'GIANT',
  'HOUSE',
  'INDEX',
  'JOKER',
  'KNIFE',
  'LEMON',
  'MUSIC',
  'NURSE',
  'OCEAN',
  'PARTY',
  'QUEEN',
  'RIVER',
  'SMART',
  'TRAIN',
  'UNION',
  'VIVID',
  'WORLD',
  'YOUNG',
  'ZEBRA',
]

const EN_6 = [
  'PUZZLE',
  'DRAGON',
  'TEMPLE',
  'WINDOW',
  'GUITAR',
  'PLANET',
  'FOREST',
  'BRIDGE',
  'CASTLE',
  'SILVER',
  'YELLOW',
  'PURPLE',
  'DOCTOR',
  'FRIEND',
  'SUMMER',
  'WINTER',
  'BUTTON',
  'CANVAS',
  'DINNER',
  'EMPIRE',
  'FLOWER',
  'GARDEN',
  'MATRIX',
  'NUMBER',
  'ORANGE',
]

const byLength: Record<4 | 5 | 6, string[]> = {
  4: EN_4,
  5: EN_5,
  6: EN_6,
}

export type WordLength = 4 | 5 | 6

/** Английские слова в офлайн-режиме, пока в БД только ru. */
export function getStaticWordListEn(length: WordLength): string[] {
  return byLength[length]
}

export function getWordOfDayEn(dateKey: string, length: WordLength): string {
  const list = getStaticWordListEn(length)
  const seed = Number(dateKey.replaceAll('-', ''))
  return list[seed % list.length]
}

/** Normalize typed word for validation (Latin or Cyrillic). */
export function normalizeWord(value: string, length: WordLength, locale: Locale): string {
  if (locale === 'en') {
    return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, length)
  }
  return value
    .toUpperCase()
    .replace(/[^А-ЯЁ]/g, '')
    .slice(0, length)
}
