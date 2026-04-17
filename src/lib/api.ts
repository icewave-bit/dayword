import type { GameMode } from './liveRound'
import type { WordLength } from './words'
import { isWordCheckDebugEnabled } from './debugEnv'
import { getViteMergedEnv } from './runtimeEnv'

export type FetchRoundMetaResult = {
  /** Только для mode=live — номер 3-часового раунда (как на сервере). */
  liveRoundId?: number
}

export type GameCellState = 'correct' | 'present' | 'absent'

export type GameGuessesSyncOk = {
  ok: true
  rows: { states: GameCellState[] }[]
  words: string[]
  status: 'playing' | 'won' | 'lost'
  /** Только при status=lost — открытое секретное слово. */
  answer: string | null
}

export type GameGuessesSyncErr =
  | { ok: false; error: 'not_in_dictionary'; index: number }
  | { ok: false; error: 'already_used'; index: number }
  | { ok: false; error: 'bad_length'; index: number }

if (isWordCheckDebugEnabled()) {
  console.warn(
    '[dayword] VITE_DEBUG_CHECK: логи в консоли браузера при нажатии Enter (отправка слова), не при наборе букв.',
  )
}

function apiBase(): string {
  const s = getViteMergedEnv('VITE_API_URL')
  if (s === '') return ''
  return s.replace(/\/$/, '')
}

export function getApiBase(): string {
  return apiBase()
}

/** Метаданные раунда без секретного слова (ответ считается на сервере). */
export async function fetchGameRoundMeta(
  params: {
    lang: 'ru' | 'en'
    length: WordLength
    mode: GameMode
    /** Обязателен при mode=practice */
    practiceSeed?: string
    signal?: AbortSignal
  },
): Promise<FetchRoundMetaResult> {
  const { lang, length, mode, practiceSeed, signal } = params
  const base = apiBase()
  const q = new URLSearchParams({
    lang,
    length: String(length),
    mode,
  })
  if (mode === 'practice') {
    if (!practiceSeed?.trim()) throw new Error('practice_seed_required')
    q.set('seed', practiceSeed.trim())
  }
  const res = await fetch(`${base}/api/game/daily?${q}`, { signal })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error ?? 'request_failed')
        : 'request_failed',
    )
  }
  const data = (await res.json()) as { liveRoundId?: number }
  const out: FetchRoundMetaResult = {}
  if (typeof data.liveRoundId === 'number' && Number.isFinite(data.liveRoundId)) {
    out.liveRoundId = data.liveRoundId
  }
  return out
}

export async function syncGameGuesses(params: {
  lang: 'ru' | 'en'
  length: WordLength
  mode: GameMode
  liveRoundId?: number | null
  seed?: string
  guesses: string[]
  signal?: AbortSignal
}): Promise<GameGuessesSyncOk | GameGuessesSyncErr> {
  const { lang, length, mode, liveRoundId, seed, guesses, signal } = params
  const base = apiBase()
  const body: Record<string, unknown> = {
    lang,
    length,
    mode,
    guesses,
  }
  if (mode === 'live') {
    if (typeof liveRoundId !== 'number' || !Number.isFinite(liveRoundId)) {
      throw new Error('live_round_required')
    }
    body.liveRoundId = liveRoundId
  } else {
    if (!seed?.trim()) throw new Error('practice_seed_required')
    body.seed = seed.trim()
  }
  const res = await fetch(`${base}/api/game/guesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'request_failed',
    )
  }
  if (data.ok === false) {
    const err = String(data.error ?? '')
    const idx = typeof data.index === 'number' && Number.isFinite(data.index) ? Math.trunc(data.index) : 0
    if (err === 'not_in_dictionary') return { ok: false, error: 'not_in_dictionary', index: idx }
    if (err === 'already_used') return { ok: false, error: 'already_used', index: idx }
    if (err === 'bad_length') return { ok: false, error: 'bad_length', index: idx }
    throw new Error(err || 'request_failed')
  }
  if (data.ok !== true || !Array.isArray(data.rows) || !Array.isArray(data.words)) {
    throw new Error('invalid_response')
  }
  const rows = data.rows as { states: GameCellState[] }[]
  const words = data.words as string[]
  const status = data.status
  if (status !== 'playing' && status !== 'won' && status !== 'lost') {
    throw new Error('invalid_response')
  }
  const answer = data.answer === null || typeof data.answer === 'string' ? data.answer : null
  return {
    ok: true,
    rows,
    words,
    status,
    answer,
  }
}

export async function checkWordInDictionary(
  lang: 'ru' | 'en',
  word: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const debugCheck = isWordCheckDebugEnabled()
  const base = apiBase()
  const url = `${base}/api/game/check`
  if (debugCheck) {
    console.warn('[checkWordInDictionary] запрос', {
      url: url || '/api/game/check (тот же origin)',
      lang,
      word,
    })
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, word }),
    signal,
  })
  const text = await res.text()
  let data: { ok?: boolean; _debug?: unknown; error?: string } = {}
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    data = {}
  }
  if (debugCheck) {
    console.warn('[checkWordInDictionary] ответ', {
      url: url || '(same-origin /api)',
      apiBase: base || '(пусто → proxy Vite на API_PORT)',
      lang,
      status: res.status,
      wordLen: word.length,
      wordCodepoints: [...word].map((ch) => {
        const cp = ch.codePointAt(0) ?? 0
        return 'U+' + cp.toString(16).toUpperCase()
      }),
      body: data,
    })
  }
  if (res.status === 404) {
    const err = data as { fallback?: boolean }
    if (err.fallback) return false
  }
  if (!res.ok) return false
  return Boolean(data.ok)
}

export async function checkWordRu(word: string, signal?: AbortSignal): Promise<boolean> {
  return checkWordInDictionary('ru', word, signal)
}

const credFetch = { credentials: 'include' as const }

export type SuggestWordStatus = 'created' | 'already_suggested' | 'resubmitted'

export async function suggestWord(
  lang: 'ru' | 'en',
  word: string,
  signal?: AbortSignal,
): Promise<{ ok: true; status: SuggestWordStatus }> {
  const base = apiBase()
  const res = await fetch(`${base}/api/game/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, word }),
    signal,
  })
  if (res.status === 409) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error ?? 'already_in_dictionary')
        : 'already_in_dictionary',
    )
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error ?? 'suggest_failed')
        : 'suggest_failed',
    )
  }
  const data = (await res.json()) as { ok?: boolean; status?: SuggestWordStatus }
  if (!data.ok || !data.status) throw new Error('invalid_response')
  return { ok: true, status: data.status }
}

export type AdminMeState = {
  authed: boolean
  encryptionConfigured: boolean
  needsFirstSetup: boolean
  hasAdmin: boolean
}

export async function adminMe(signal?: AbortSignal): Promise<AdminMeState> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/me`, { ...credFetch, signal })
  if (!res.ok) throw new Error('admin_me_failed')
  const data = (await res.json()) as Partial<AdminMeState>
  return {
    authed: Boolean(data.authed),
    encryptionConfigured: Boolean(data.encryptionConfigured),
    needsFirstSetup: Boolean(data.needsFirstSetup),
    hasAdmin: Boolean(data.hasAdmin),
  }
}

export async function adminRegister(
  params: { username: string; password: string; passwordConfirm: string },
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    ...credFetch,
    signal,
  })
  if (res.status === 403) throw new Error('already_registered')
  if (res.status === 503) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'encryption_not_configured'
    throw new Error(code)
  }
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'bad_request'
    throw new Error(code)
  }
  if (!res.ok) throw new Error('register_failed')
}

export async function adminLogin(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    ...credFetch,
    signal,
  })
  if (res.status === 503) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'admin_not_configured'
    throw new Error(code)
  }
  if (!res.ok) throw new Error('invalid_credentials')
}

export async function adminLogout(signal?: AbortSignal): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/logout`, { method: 'POST', ...credFetch, signal })
  if (!res.ok) throw new Error('logout_failed')
}

export async function adminChangePassword(
  params: { currentPassword: string; newPassword: string; newPasswordConfirm: string },
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    ...credFetch,
    signal,
  })
  if (res.status === 401) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'wrong_current_password'
    throw new Error(code)
  }
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'bad_request'
    throw new Error(code)
  }
  if (res.status === 503) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'encryption_not_configured'
    throw new Error(code)
  }
  if (!res.ok) throw new Error('change_password_failed')
}

export type AdminSuggestion = { lang: 'ru' | 'en'; word: string; suggestedAt: number | null }

export async function adminListSuggestions(signal?: AbortSignal): Promise<AdminSuggestion[]> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/suggestions`, { ...credFetch, signal })
  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) throw new Error('list_failed')
  const data = (await res.json()) as { items?: AdminSuggestion[] }
  return Array.isArray(data.items) ? data.items : []
}

export async function adminApproveSuggestion(
  lang: 'ru' | 'en',
  word: string,
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/suggestions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, word }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) throw new Error('approve_failed')
}

export async function adminDismissSuggestion(
  lang: 'ru' | 'en',
  word: string,
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/suggestions/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, word }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) throw new Error('dismiss_failed')
}

export type AdminImportInvalidItem = {
  raw: string
  reason: 'empty' | 'bad_length' | 'bad_line' | 'insert_failed'
}

export type AdminImportExistingItem = {
  word: string
  source: string
}

export type AdminImportWordsResult =
  | {
      ok: true
      added: string[]
      alreadyInDatabase: AdminImportExistingItem[]
      invalid: AdminImportInvalidItem[]
      counts: {
        added: number
        alreadyInDatabase: number
        invalid: number
      }
    }
  | {
      ok: false
      error: string
      maxLines?: number
      added: string[]
      alreadyInDatabase: AdminImportExistingItem[]
      invalid: AdminImportInvalidItem[]
    }

export async function adminImportWords(
  params: { lang: 'ru' | 'en'; text: string },
  signal?: AbortSignal,
): Promise<AdminImportWordsResult> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/words/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: params.lang, text: params.text }),
    ...credFetch,
    signal,
  })
  const data = (await res.json().catch(() => ({}))) as AdminImportWordsResult & {
    error?: string
    maxLines?: number
  }
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 400) {
    if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
      return data as AdminImportWordsResult
    }
    throw new Error('import_failed')
  }
  if (!res.ok) throw new Error('import_failed')
  if (!data || data.ok !== true || !Array.isArray(data.added)) throw new Error('invalid_response')
  if (!data.counts || typeof data.counts.added !== 'number') throw new Error('invalid_response')
  return data as AdminImportWordsResult
}

export type AdminDictionaryWordsPage = {
  items: string[]
  total: number
  limit: number
  offset: number
}

export async function adminListDictionaryWords(
  params: {
    lang: 'ru' | 'en'
    length: WordLength
    limit?: number
    offset?: number
    /** Одна буква (en/ru), фильтр word LIKE prefix% */
    prefix?: string | null
    /** Подстрока в слове (сервер нормализует) */
    q?: string | null
  },
  signal?: AbortSignal,
): Promise<AdminDictionaryWordsPage> {
  const base = apiBase()
  const q = new URLSearchParams({
    lang: params.lang,
    length: String(params.length),
    limit: String(params.limit ?? 200),
    offset: String(params.offset ?? 0),
  })
  if (params.prefix && params.prefix.length > 0) {
    q.set('prefix', params.prefix)
  }
  if (params.q && params.q.trim() !== '') {
    q.set('q', params.q.trim())
  }
  const res = await fetch(`${base}/api/admin/dictionary/words?${q}`, { ...credFetch, signal })
  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) throw new Error('dictionary_list_failed')
  const data = (await res.json()) as {
    ok?: boolean
    items?: string[]
    total?: number
    limit?: number
    offset?: number
  }
  if (!data.ok || !Array.isArray(data.items) || typeof data.total !== 'number') {
    throw new Error('invalid_response')
  }
  return {
    items: data.items,
    total: data.total,
    limit: typeof data.limit === 'number' ? data.limit : 200,
    offset: typeof data.offset === 'number' ? data.offset : 0,
  }
}

export async function adminDeleteDictionaryWord(
  lang: 'ru' | 'en',
  word: string,
  signal?: AbortSignal,
): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/dictionary/words`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, word }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 404) throw new Error('not_found')
  if (!res.ok) throw new Error('dictionary_delete_failed')
}

export async function adminUpdateDictionaryWord(
  params: { lang: 'ru' | 'en'; word: string; newWord: string },
  signal?: AbortSignal,
): Promise<{ word: string }> {
  const base = apiBase()
  const res = await fetch(`${base}/api/admin/dictionary/words`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lang: params.lang,
      word: params.word,
      newWord: params.newWord,
    }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 404) throw new Error('not_found')
  if (res.status === 409) throw new Error('conflict')
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'bad_request'
    throw new Error(code)
  }
  if (!res.ok) throw new Error('dictionary_update_failed')
  const data = (await res.json()) as { ok?: boolean; word?: string }
  if (!data.ok || typeof data.word !== 'string') throw new Error('invalid_response')
  return { word: data.word }
}

export type AppUser = { id: number; username: string }

export async function userMe(signal?: AbortSignal): Promise<{
  authed: boolean
  user: AppUser | null
  totalLiveScore: number | null
}> {
  const base = apiBase()
  const res = await fetch(`${base}/api/user/me`, { ...credFetch, signal })
  if (!res.ok) throw new Error('user_me_failed')
  const data = (await res.json()) as {
    authed?: boolean
    user?: AppUser | null
    totalLiveScore?: unknown
  }
  const rawTotal = data.totalLiveScore
  const totalLiveScore =
    typeof rawTotal === 'number' && Number.isFinite(rawTotal) ? rawTotal : null
  return {
    authed: Boolean(data.authed),
    user: data.user ?? null,
    totalLiveScore: data.authed ? totalLiveScore ?? 0 : null,
  }
}

export type SubmitLiveScoreResult = {
  ok: true
  duplicate: boolean
  points: number
  won?: boolean
  attempts?: number
}

/** Сохранить результат общего (live) раунда. Только для сессии пользователя. */
export async function submitLiveRoundScore(
  params: {
    lang: 'ru' | 'en'
    length: WordLength
    liveRoundId: number
    won: boolean
    attempts: number
    solveDurationMs: number
  },
  signal?: AbortSignal,
): Promise<SubmitLiveScoreResult> {
  const base = apiBase()
  const res = await fetch(`${base}/api/game/submit-live-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lang: params.lang,
      length: params.length,
      liveRoundId: params.liveRoundId,
      won: params.won,
      attempts: params.attempts,
      solveDurationMs: params.solveDurationMs,
    }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('unauthorized')
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    duplicate?: boolean
    points?: number
    won?: boolean
    attempts?: number
    error?: string
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'submit_score_failed')
  }
  if (!data.ok || typeof data.points !== 'number') throw new Error('invalid_response')
  return {
    ok: true,
    duplicate: Boolean(data.duplicate),
    points: data.points,
    won: data.won,
    attempts: data.attempts,
  }
}

export async function userLogin(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<AppUser> {
  const base = apiBase()
  const res = await fetch(`${base}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    ...credFetch,
    signal,
  })
  if (res.status === 401) throw new Error('invalid_credentials')
  if (!res.ok) throw new Error('login_failed')
  const data = (await res.json()) as { user?: AppUser }
  if (!data.user) throw new Error('invalid_response')
  return data.user
}

export async function userRegister(
  params: { username: string; password: string; passwordConfirm: string },
  signal?: AbortSignal,
): Promise<AppUser> {
  const base = apiBase()
  const res = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    ...credFetch,
    signal,
  })
  if (res.status === 409) throw new Error('username_taken')
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}))
    const code =
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: string }).error)
        : 'bad_request'
    throw new Error(code)
  }
  if (!res.ok) throw new Error('register_failed')
  const data = (await res.json()) as { user?: AppUser }
  if (!data.user) throw new Error('invalid_response')
  return data.user
}

export async function userLogout(signal?: AbortSignal): Promise<void> {
  const base = apiBase()
  const res = await fetch(`${base}/api/user/logout`, { method: 'POST', ...credFetch, signal })
  if (!res.ok) throw new Error('logout_failed')
}

export type MonthlyLeaderboardTop3Item = {
  username: string
  points: number
}

export async function fetchMonthlyLeaderboardTop3(signal?: AbortSignal): Promise<
  MonthlyLeaderboardTop3Item[]
> {
  const base = apiBase()
  const res = await fetch(`${base}/api/leaderboard/month`, { signal })
  if (!res.ok) throw new Error('leaderboard_failed')
  const data = (await res.json().catch(() => ({}))) as { items?: MonthlyLeaderboardTop3Item[] }
  return Array.isArray(data.items) ? data.items : []
}
