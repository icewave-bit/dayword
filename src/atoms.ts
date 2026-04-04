import { atom } from 'jotai'
import {
  checkWordInDictionary,
  fetchGameWord,
  fetchMonthlyLeaderboardTop3,
  submitLiveRoundScore,
  userLogout,
  userMe,
} from './lib/api'
import { isWordCheckDebugEnabled } from './lib/debugEnv'
import type { Locale } from './lib/i18n'
import type { GameMode } from './lib/liveRound'
import { normalizeWord, type WordLength } from './lib/words'

export const MAX_ATTEMPTS = 6

export type ThemeMode = 'dark' | 'light'
export type GameSession = 'setup' | 'playing'

export const localeAtom = atom<Locale>('ru')
export const wordLengthAtom = atom<WordLength>(5)
export const themeAtom = atom<ThemeMode>('dark')
export const sessionAtom = atom<GameSession>('setup')
export const helpOpenAtom = atom(false)
export const settingsOpenAtom = atom(false)
/** Подтверждение выхода из экрана игры в меню */
export const exitGameConfirmOpenAtom = atom(false)

/** Вкладка языка в админке: список предложенных слов. */
export const adminSuggestionsLangTabAtom = atom<'ru' | 'en'>('ru')

/** Панель настроек админки (смена пароля и т.п.). */
export const adminSettingsOpenAtom = atom(false)

export const gameLoadingAtom = atom(false)
export const gameLoadErrorAtom = atom<string | null>(null)

export const utcDateKey = (): string => {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export const gameDateAtom = atom<string>(utcDateKey())
export const answerAtom = atom<string>('')
/** Режим: общее слово на 3 ч (live) или случайное слово (practice). */
export const gameModeAtom = atom<GameMode>('live')
/** Для practice — случайный seed; для live не используется. */
export const gameSeedAtom = atom<string>('')
/** Номер 3-часового раунда с сервера (только live). */
export const liveRoundIdAtom = atom<number | null>(null)

const SETTINGS_KEY = 'dayword.settings.v1'

let loadDailySeq = 0

export const loadSettingsAtom = atom(null, (_get, set) => {
  set(gameDateAtom, utcDateKey())
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      locale?: Locale
      wordLength?: WordLength
      theme?: ThemeMode
      session?: GameSession
      gameMode?: GameMode
      practiceSeed?: string
    }
    if (parsed.locale === 'ru' || parsed.locale === 'en') set(localeAtom, parsed.locale)
    if (parsed.wordLength === 4 || parsed.wordLength === 5 || parsed.wordLength === 6) {
      set(wordLengthAtom, parsed.wordLength)
    }
    if (parsed.theme === 'dark' || parsed.theme === 'light') set(themeAtom, parsed.theme)
    if (parsed.session === 'playing' || parsed.session === 'setup') set(sessionAtom, parsed.session)
    if (parsed.gameMode === 'live' || parsed.gameMode === 'practice') {
      set(gameModeAtom, parsed.gameMode)
    }
    if (
      parsed.gameMode === 'practice' &&
      typeof parsed.practiceSeed === 'string' &&
      parsed.practiceSeed.length > 0
    ) {
      set(gameSeedAtom, parsed.practiceSeed)
    }
  } catch {
    localStorage.removeItem(SETTINGS_KEY)
  }
})

export const persistSettingsAtom = atom(null, (get) => {
  const session = get(sessionAtom)
  const mode = get(gameModeAtom)
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      locale: get(localeAtom),
      wordLength: get(wordLengthAtom),
      theme: get(themeAtom),
      session,
      gameMode: mode,
      practiceSeed:
        session === 'playing' && mode === 'practice' ? get(gameSeedAtom) || undefined : undefined,
    }),
  )
})

function liveGameStorageKey(locale: Locale, length: WordLength, liveRoundId: number): string {
  return `dayword.game.live.v2.${locale}.${length}.${liveRoundId}`
}

function practiceGameStorageKey(locale: Locale, length: WordLength, seed: string): string {
  return `dayword.game.practice.v2.${locale}.${length}.${seed}`
}

type StoredLiveGame = {
  liveRoundId: number
  guesses: string[]
}

type StoredPracticeGame = {
  seed: string
  guesses: string[]
}

const guessesAtom = atom<string[]>([])
/** Время (время монотонных тиков) первого успешного submit-слова в live-раунде. */
export const firstGuessSubmittedAtMsAtom = atom<number | null>(null)
export const currentGuessAtom = atom('')
export const messageAtom = atom('')
type GameStatus = 'playing' | 'won' | 'lost'
export const statusAtom = atom<GameStatus>('playing')
type CellState = 'correct' | 'present' | 'absent'
export const keyboardStateAtom = atom<Record<string, CellState>>({})

type GuessResult = { word: string; states: CellState[] }

const wordLengthForGame = atom((get) => get(wordLengthAtom))

const scoreGuess = (guess: string, answer: string, length: number): CellState[] => {
  const g = guess.toUpperCase()
  const a = answer.toUpperCase()
  const states: CellState[] = Array.from({ length }, () => 'absent')
  const remaining = a.split('')

  for (let i = 0; i < length; i += 1) {
    if (g[i] === a[i]) {
      states[i] = 'correct'
      remaining[i] = '*'
    }
  }

  for (let i = 0; i < length; i += 1) {
    if (states[i] === 'correct') continue
    const idx = remaining.indexOf(g[i])
    if (idx >= 0) {
      states[i] = 'present'
      remaining[idx] = '*'
    }
  }

  return states
}

export const resultsAtom = atom<GuessResult[]>((get) => {
  const answer = get(answerAtom)
  const len = get(wordLengthForGame)
  if (!answer) return []
  return get(guessesAtom).map((word) => ({
    word,
    states: scoreGuess(word, answer, len),
  }))
})

async function filterHydratedGuesses(
  locale: Locale,
  length: WordLength,
  guesses: string[],
  seq: number,
): Promise<string[]> {
  const normalized = guesses
    .map((word) => normalizeWord(word, length, locale))
    .filter((word) => word.length === length)
    .slice(0, MAX_ATTEMPTS)

  const flags = await Promise.all(
    normalized.map(async (w) => {
      if (seq !== loadDailySeq) return false
      return checkWordInDictionary(locale, w)
    }),
  )
  return normalized.filter((_, i) => flags[i])
}

export const loadDailyAndHydrateAtom = atom(null, async (get, set) => {
  const seq = ++loadDailySeq
  set(gameLoadingAtom, true)
  set(gameLoadErrorAtom, null)
  try {
    set(messageAtom, '')
    const locale = get(localeAtom)
    const length = get(wordLengthAtom)
    const mode = get(gameModeAtom)

    if (mode === 'live') {
      const data = await fetchGameWord({ lang: locale, length, mode: 'live' })
      if (seq !== loadDailySeq) return
      const rid = data.liveRoundId
      if (rid === undefined) throw new Error('invalid_response')
      set(liveRoundIdAtom, rid)
      set(answerAtom, data.word)
      set(gameSeedAtom, '')

      const key = liveGameStorageKey(locale, length, rid)
      const savedRaw = localStorage.getItem(key)
      if (!savedRaw) {
        set(guessesAtom, [])
      } else {
        try {
          const parsed = JSON.parse(savedRaw) as Partial<StoredLiveGame>
          if (parsed.liveRoundId !== rid || !Array.isArray(parsed.guesses)) {
            localStorage.removeItem(key)
            set(guessesAtom, [])
          } else {
            const safe = await filterHydratedGuesses(locale, length, parsed.guesses, seq)
            if (seq !== loadDailySeq) return
            set(guessesAtom, safe)
          }
        } catch {
          localStorage.removeItem(key)
          set(guessesAtom, [])
        }
      }
    } else {
      let seed = get(gameSeedAtom)
      if (!seed) {
        seed = crypto.randomUUID()
        set(gameSeedAtom, seed)
      }
      const key = practiceGameStorageKey(locale, length, seed)
      const savedRaw = localStorage.getItem(key)
      const data = await fetchGameWord({
        lang: locale,
        length,
        mode: 'practice',
        practiceSeed: seed,
      })
      if (seq !== loadDailySeq) return
      set(liveRoundIdAtom, null)
      set(answerAtom, data.word)

      if (!savedRaw) {
        set(guessesAtom, [])
      } else {
        try {
          const parsed = JSON.parse(savedRaw) as Partial<StoredPracticeGame>
          if (parsed.seed !== seed || !Array.isArray(parsed.guesses)) {
            localStorage.removeItem(key)
            set(guessesAtom, [])
          } else {
            const safe = await filterHydratedGuesses(locale, length, parsed.guesses, seq)
            if (seq !== loadDailySeq) return
            set(guessesAtom, safe)
          }
        } catch {
          localStorage.removeItem(key)
          set(guessesAtom, [])
        }
      }
    }

    if (seq !== loadDailySeq) return
    set(recomputeGameAtom)
    set(persistSettingsAtom)
  } catch (e) {
    if (seq !== loadDailySeq) return
    set(
      gameLoadErrorAtom,
      e instanceof Error ? e.message : 'unknown',
    )
    set(answerAtom, '')
    set(guessesAtom, [])
    set(liveRoundIdAtom, null)
  } finally {
    if (seq === loadDailySeq) set(gameLoadingAtom, false)
  }
})

const persistGameAtom = atom(null, (get) => {
  const locale = get(localeAtom)
  const length = get(wordLengthAtom)
  const mode = get(gameModeAtom)
  const guesses = get(guessesAtom)

  if (mode === 'live') {
    const rid = get(liveRoundIdAtom)
    if (rid === null) return
    const payload: StoredLiveGame = { liveRoundId: rid, guesses }
    localStorage.setItem(liveGameStorageKey(locale, length, rid), JSON.stringify(payload))
    return
  }

  const seed = get(gameSeedAtom)
  if (!seed) return
  const payload: StoredPracticeGame = { seed, guesses }
  localStorage.setItem(practiceGameStorageKey(locale, length, seed), JSON.stringify(payload))
})

export const recomputeGameAtom = atom(null, (get, set) => {
  const answer = get(answerAtom)
  const guesses = get(guessesAtom)
  const locale = get(localeAtom)
  const len = get(wordLengthForGame)
  const won =
    Boolean(answer) &&
    guesses.some((word) => normalizeWord(word, len, locale) === answer)
  const status = !answer
    ? 'playing'
    : won
      ? 'won'
      : guesses.length >= MAX_ATTEMPTS
        ? 'lost'
        : 'playing'
  set(statusAtom, status)

  const keyStates: Record<string, CellState> = {}
  for (const result of get(resultsAtom)) {
    result.word.split('').forEach((letter, index) => {
      const nextState = result.states[index]
      const prevState = keyStates[letter]
      if (
        !prevState ||
        nextState === 'correct' ||
        (nextState === 'present' && prevState === 'absent')
      ) {
        keyStates[letter] = nextState
      }
    })
  }
  set(keyboardStateAtom, keyStates)
})

export const submitGuessAtom = atom(null, async (get, set) => {
  if (get(statusAtom) !== 'playing' || get(gameLoadingAtom)) return
  const answer = get(answerAtom)
  if (!answer) return

  const locale = get(localeAtom)
  const length = get(wordLengthAtom)
  const current = get(currentGuessAtom)

  if (current.length !== length) {
    if (isWordCheckDebugEnabled()) {
      console.warn('[submitGuess] слово не той длины — запрос к API не отправляется', {
        currentLen: current.length,
        length,
      })
    }
    set(messageAtom, 'short')
    return
  }

  if (isWordCheckDebugEnabled()) {
    console.warn('[submitGuess]', {
      locale,
      willCallCheckApi: true,
      note: 'Проверка слова через SQLite (ru/en) → POST /api/game/check',
      word: current,
    })
  }

  const canonical = normalizeWord(current, length, locale)
  const inDictionary = await checkWordInDictionary(locale, canonical)

  if (!inDictionary) {
    set(messageAtom, 'notInDictionary')
    return
  }
  const dup = get(guessesAtom).some(
    (g) => normalizeWord(g, length, locale) === canonical,
  )
  if (dup) {
    set(messageAtom, 'alreadyUsed')
    return
  }

  const prevGuessesCount = get(guessesAtom).length
  // Таймер старта: момент первого успешного сабмита (только для live).
  if (prevGuessesCount === 0 && get(gameModeAtom) === 'live') {
    set(firstGuessSubmittedAtMsAtom, performance.now())
  }

  set(guessesAtom, [...get(guessesAtom), current])
  set(currentGuessAtom, '')
  set(messageAtom, '')
  set(recomputeGameAtom)
  set(persistGameAtom)
})

/** После успешного предложения слова: очистить ввод и показать ответ в строке сообщений. */
export const afterWordSuggestedAtom = atom(
  null,
  (_get, set, kind: 'sent' | 'dup') => {
    set(currentGuessAtom, '')
    set(messageAtom, kind === 'dup' ? 'suggestDup' : 'suggestSent')
  },
)

export const addLetterAtom = atom(null, (get, set, letter: string) => {
  if (get(statusAtom) !== 'playing' || get(gameLoadingAtom)) return
  if (!get(answerAtom)) return
  const length = get(wordLengthAtom)
  const current = get(currentGuessAtom)
  if (current.length >= length) return
  set(currentGuessAtom, `${current}${letter}`)
  set(messageAtom, '')
})

export const removeLetterAtom = atom(null, (get, set) => {
  if (get(statusAtom) !== 'playing' || get(gameLoadingAtom)) return
  const current = get(currentGuessAtom)
  if (current.length === 0) {
    const msg = get(messageAtom)
    if (msg === 'suggestSent' || msg === 'suggestDup') set(messageAtom, '')
    return
  }
  set(currentGuessAtom, current.slice(0, -1))
})

export const resetGameAtom = atom(null, async (get, set) => {
  const locale = get(localeAtom)
  const length = get(wordLengthAtom)
  const mode = get(gameModeAtom)

  if (mode === 'live') {
    const rid = get(liveRoundIdAtom)
    if (rid !== null) {
      localStorage.removeItem(liveGameStorageKey(locale, length, rid))
    }
    set(guessesAtom, [])
    set(firstGuessSubmittedAtMsAtom, null)
    set(currentGuessAtom, '')
    set(messageAtom, '')
    set(statusAtom, 'playing')
    set(keyboardStateAtom, {})
    set(recomputeGameAtom)
    set(persistSettingsAtom)
    return
  }

  const seed = get(gameSeedAtom)
  if (seed) {
    localStorage.removeItem(practiceGameStorageKey(locale, length, seed))
  }
  set(gameSeedAtom, crypto.randomUUID())
  set(guessesAtom, [])
  set(currentGuessAtom, '')
  set(messageAtom, '')
  set(statusAtom, 'playing')
  set(keyboardStateAtom, {})
  set(persistSettingsAtom)
  await set(loadDailyAndHydrateAtom)
})

export const startLiveGameAtom = atom(null, (_get, set) => {
  set(gameModeAtom, 'live')
  set(gameDateAtom, utcDateKey())
  set(gameSeedAtom, '')
  set(liveRoundIdAtom, null)
  set(sessionAtom, 'playing')
  set(guessesAtom, [])
  set(firstGuessSubmittedAtMsAtom, null)
  set(currentGuessAtom, '')
  set(messageAtom, '')
  set(statusAtom, 'playing')
  set(keyboardStateAtom, {})
  set(answerAtom, '')
  set(gameLoadErrorAtom, null)
  set(persistSettingsAtom)
})

export const startPracticeGameAtom = atom(null, (_get, set) => {
  set(gameModeAtom, 'practice')
  set(gameDateAtom, utcDateKey())
  set(gameSeedAtom, crypto.randomUUID())
  set(liveRoundIdAtom, null)
  set(sessionAtom, 'playing')
  set(guessesAtom, [])
  set(firstGuessSubmittedAtMsAtom, null)
  set(currentGuessAtom, '')
  set(messageAtom, '')
  set(statusAtom, 'playing')
  set(keyboardStateAtom, {})
  set(answerAtom, '')
  set(gameLoadErrorAtom, null)
  set(persistSettingsAtom)
})

export const openSetupAtom = atom(null, (_get, set) => {
  set(exitGameConfirmOpenAtom, false)
  set(sessionAtom, 'setup')
  set(persistSettingsAtom)
})

export const keyboardRowsAtom = atom((get): string[] => {
  const locale = get(localeAtom)
  if (locale === 'en') {
    return ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
  }
  return ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮЁ']
})

export type UserAuthState =
  | { status: 'unknown' }
  | { status: 'anon' }
  | { status: 'authed'; id: number; username: string; totalLiveScore: number }

export const userAuthAtom = atom<UserAuthState>({ status: 'unknown' })

export type LeaderboardTop3Item = import('./lib/api').MonthlyLeaderboardTop3Item
export const leaderboardMonthTop3Atom = atom<LeaderboardTop3Item[]>([])
export const leaderboardMonthTop3LoadingAtom = atom(false)
export const refreshLeaderboardMonthTop3Atom = atom(null, async (_get, set) => {
  set(leaderboardMonthTop3LoadingAtom, true)
  try {
    const items = await fetchMonthlyLeaderboardTop3()
    set(leaderboardMonthTop3Atom, items)
  } catch {
    set(leaderboardMonthTop3Atom, [])
  } finally {
    set(leaderboardMonthTop3LoadingAtom, false)
  }
})

export const refreshUserMeAtom = atom(null, async (_get, set) => {
  try {
    const r = await userMe()
    if (r.authed && r.user) {
      set(userAuthAtom, {
        status: 'authed',
        id: r.user.id,
        username: r.user.username,
        totalLiveScore: r.totalLiveScore ?? 0,
      })
    } else {
      set(userAuthAtom, { status: 'anon' })
    }
  } catch {
    set(userAuthAtom, { status: 'anon' })
  }
})

/** Отправить на сервер итог live-раунда (одна строка на пару user + раунд + язык + длина). */
export const syncLiveRoundScoreAtom = atom(null, async (get, set) => {
  if (get(gameModeAtom) !== 'live') return
  const st = get(statusAtom)
  if (st !== 'won' && st !== 'lost') return
  const u = get(userAuthAtom)
  if (u.status !== 'authed') return
  const rid = get(liveRoundIdAtom)
  if (rid === null) return
  const locale = get(localeAtom)
  const len = get(wordLengthAtom)
  const guesses = get(guessesAtom)
  const answer = get(answerAtom)
  if (!answer) return

  const won = st === 'won'
  if (won) {
    const last = guesses.length > 0 ? normalizeWord(guesses[guesses.length - 1], len, locale) : ''
    if (last !== answer) return
  } else {
    if (guesses.length !== MAX_ATTEMPTS) return
  }

  const attempts = won ? guesses.length : MAX_ATTEMPTS
  const startMs = get(firstGuessSubmittedAtMsAtom)
  const solveDurationMs = startMs === null ? 0 : Math.max(0, Math.floor(performance.now() - startMs))

  try {
    const r = await submitLiveRoundScore({
      lang: locale,
      length: len,
      liveRoundId: rid,
      won,
      attempts,
      solveDurationMs,
    })
    if (r.ok && !r.duplicate) {
      await set(refreshUserMeAtom)
    }
  } catch {
    // сеть / 401 — тихо, повтор при следующем рендере или новой сессии
  }
})

export const logoutUserAtom = atom(null, async (_get, set) => {
  try {
    await userLogout()
  } catch {
    // ignore — still clear local state
  }
  set(userAuthAtom, { status: 'anon' })
})
