import 'dotenv/config'
import cors from 'cors'
import Database from 'better-sqlite3'
import express from 'express'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const dbPathRaw = process.env.DICTIONARY_DB_PATH
if (!dbPathRaw || !String(dbPathRaw).trim()) {
  console.error('Задайте DICTIONARY_DB_PATH в .env (путь к SQLite словарю).')
  process.exit(1)
}

const dbPath = path.resolve(dbPathRaw)
if (!fs.existsSync(dbPath)) {
  console.error(`Файл словаря не найден: ${dbPath}`)
  process.exit(1)
}

const app = express()
const port = Number(process.env.API_PORT)
if (!Number.isFinite(port) || port <= 0) {
  console.error('Задайте корректный API_PORT в .env')
  process.exit(1)
}
const host = process.env.API_HOST?.trim() || '0.0.0.0'

const debugGameCheckRaw = String(process.env.DEBUG_GAME_CHECK ?? '').trim().toLowerCase()
const debugGameCheck = debugGameCheckRaw === '1' || debugGameCheckRaw === 'true'

const corsOrigin = process.env.CORS_ORIGIN
const corsCredentials = Boolean(corsOrigin && corsOrigin.trim())
app.use(
  cors({
    origin:
      corsOrigin && corsOrigin.trim() ? corsOrigin.split(',').map((s) => s.trim()) : true,
    credentials: corsCredentials,
  }),
)
const jsonBodyDefault = express.json({ limit: '32kb' })
const jsonBodyAdminImport = express.json({ limit: '2mb' })
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/admin/words/import') {
    return jsonBodyAdminImport(req, res, next)
  }
  return jsonBodyDefault(req, res, next)
})

if (debugGameCheck) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const bodyPreview =
        req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
          ? JSON.stringify(req.body).slice(0, 240)
          : ''
      console.warn('[api incoming]', req.method, req.path, bodyPreview || '(no json body)')
    }
    next()
  })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function columnNames(dbConn, table) {
  return dbConn.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name)
}

function migrate() {
  const cols = columnNames(db, 'words')
  if (!cols.includes('source')) {
    db.exec(`ALTER TABLE words ADD COLUMN source TEXT NOT NULL DEFAULT 'dictionary'`)
  }
  if (!columnNames(db, 'words').includes('suggested_at')) {
    db.exec('ALTER TABLE words ADD COLUMN suggested_at INTEGER')
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username_enc BLOB NOT NULL,
      password_enc BLOB NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_round_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      live_round_id INTEGER NOT NULL,
      language_code TEXT NOT NULL CHECK (language_code IN ('ru', 'en')),
      word_length INTEGER NOT NULL CHECK (word_length IN (4, 5, 6)),
      won INTEGER NOT NULL CHECK (won IN (0, 1)),
      attempts INTEGER NOT NULL CHECK (attempts >= 1 AND attempts <= 6),
      points INTEGER NOT NULL CHECK (points >= 0 AND points <= 200),
      recorded_at INTEGER NOT NULL,
      solve_duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (solve_duration_ms >= 0),
      UNIQUE (user_id, live_round_id, language_code, word_length)
    )
  `)
  if (!columnNames(db, 'live_round_scores').includes('solve_duration_ms')) {
    db.exec('ALTER TABLE live_round_scores ADD COLUMN solve_duration_ms INTEGER NOT NULL DEFAULT 0')
  }
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_live_round_scores_user ON live_round_scores(user_id)',
  )
}

migrate()

function getEncryptionKey() {
  const hex = process.env.ADMIN_ENCRYPTION_KEY?.trim()
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) return null
  return Buffer.from(hex, 'hex')
}

function encryptField(plaintext, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc])
}

function decryptField(blob, key) {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob)
  if (buf.length < 12 + 16) throw new Error('bad_blob')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

function hasAdminCredentialsRow() {
  return Boolean(db.prepare('SELECT 1 FROM admin_credentials WHERE id = 1').get())
}

const SESSION_COOKIE = 'dayword_admin'
const SESSION_MS = 24 * 60 * 60 * 1000
/** @type {Map<string, number>} */
const adminSessions = new Map()

const USER_SESSION_COOKIE = 'dayword_user'
const USER_SESSION_MS = 7 * 24 * 60 * 60 * 1000
/** @type {Map<string, { userId: number; username: string; exp: number }>} */
const userSessions = new Map()

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function hashUserPassword(plain) {
  const salt = randomBytes(16)
  const hash = scryptSync(String(plain), salt, 64, SCRYPT_OPTS)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

function verifyUserPassword(plain, stored) {
  const parts = String(stored).split(':')
  if (parts.length !== 2) return false
  const [saltHex, hashHex] = parts
  if (!/^[0-9a-fA-F]{32}$/.test(saltHex) || !/^[0-9a-fA-F]+$/.test(hashHex)) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  let actual
  try {
    actual = scryptSync(String(plain), salt, expected.length, SCRYPT_OPTS)
  } catch {
    return false
  }
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

function normalizeUsername(raw) {
  return String(raw).trim().toLowerCase()
}

function isValidUsername(u) {
  return /^[a-z0-9_]{3,32}$/.test(u)
}

function cookieSecureFlag() {
  return (
    String(process.env.ADMIN_COOKIE_SECURE ?? '').trim() === '1' ||
    String(process.env.NODE_ENV).toLowerCase() === 'production'
  )
}

function setUserSessionCookie(res, token) {
  const secure = cookieSecureFlag()
  const parts = [
    `${USER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(USER_SESSION_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearUserSessionCookie(res) {
  const secure = cookieSecureFlag()
  const parts = [`${USER_SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function readUserSessionData(req) {
  const c = parseCookies(req.headers.cookie)
  const token = c[USER_SESSION_COOKIE]
  if (!token || typeof token !== 'string') return null
  const data = userSessions.get(token)
  if (!data || data.exp < Date.now()) {
    userSessions.delete(token)
    return null
  }
  return { token, ...data }
}

function readAuthedUserId(req) {
  const s = readUserSessionData(req)
  return s ? s.userId : null
}

function issueUserSession(res, userId, username) {
  const token = randomBytes(32).toString('hex')
  userSessions.set(token, { userId, username, exp: Date.now() + USER_SESSION_MS })
  setUserSessionCookie(res, token)
  return token
}

const stmtInsertUser = db.prepare(
  'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
)
const stmtUserByUsername = db.prepare(
  'SELECT id, username, password_hash FROM users WHERE username = ?',
)

const stmtInsertLiveScore = db.prepare(`
  INSERT INTO live_round_scores (user_id, live_round_id, language_code, word_length, won, attempts, points, recorded_at, solve_duration_ms)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const stmtSelectLiveScore = db.prepare(`
  SELECT points, won, attempts FROM live_round_scores
  WHERE user_id = ? AND live_round_id = ? AND language_code = ? AND word_length = ?
`)
const stmtSumUserLiveScore = db.prepare(
  'SELECT COALESCE(SUM(points), 0) AS total FROM live_round_scores WHERE user_id = ?',
)

const stmtMonthlyTop3 = db.prepare(`
  SELECT
    u.username AS username,
    SUM(s.points) AS total
  FROM live_round_scores s
  JOIN users u ON u.id = s.user_id
  WHERE s.recorded_at >= ? AND s.recorded_at < ?
  GROUP BY u.id
  HAVING SUM(s.points) > 0
  ORDER BY total DESC, MAX(s.recorded_at) DESC
  LIMIT 3
`)

function parseCookies(header) {
  const out = {}
  if (!header || typeof header !== 'string') return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    try {
      out[k] = decodeURIComponent(v)
    } catch {
      out[k] = v
    }
  }
  return out
}

function setSessionCookie(res, token) {
  const secure =
    String(process.env.ADMIN_COOKIE_SECURE ?? '').trim() === '1' ||
    String(process.env.NODE_ENV).toLowerCase() === 'production'
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearSessionCookie(res) {
  const secure =
    String(process.env.ADMIN_COOKIE_SECURE ?? '').trim() === '1' ||
    String(process.env.NODE_ENV).toLowerCase() === 'production'
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function readAdminSession(req) {
  const c = parseCookies(req.headers.cookie)
  const token = c[SESSION_COOKIE]
  if (!token || typeof token !== 'string') return null
  const exp = adminSessions.get(token)
  if (!exp || exp < Date.now()) {
    adminSessions.delete(token)
    return null
  }
  return token
}

function adminPublicState(req) {
  const key = getEncryptionKey()
  const encryptionConfigured = Boolean(key)
  const hasAdmin = hasAdminCredentialsRow()
  const authed = Boolean(readAdminSession(req))
  const needsFirstSetup = encryptionConfigured && !hasAdmin
  return { authed, encryptionConfigured, needsFirstSetup, hasAdmin }
}

function requireAdmin(req, res, next) {
  if (!readAdminSession(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  next()
}

function loadAdminUserPass() {
  const key = getEncryptionKey()
  if (!key) return null
  const row = db
    .prepare('SELECT username_enc, password_enc FROM admin_credentials WHERE id = 1')
    .get()
  if (!row) return null
  try {
    return {
      username: decryptField(row.username_enc, key),
      password: decryptField(row.password_enc, key),
    }
  } catch {
    return null
  }
}

const DICT_SOURCE = "COALESCE(NULLIF(TRIM(source), ''), 'dictionary')"

const stmtCount = db.prepare(
  `SELECT COUNT(*) AS c FROM words
   WHERE language_code = ? AND length(word) = ? AND (${DICT_SOURCE}) = 'dictionary'`,
)
const stmtDaily = db.prepare(
  `SELECT word FROM words
   WHERE language_code = ? AND length(word) = ? AND (${DICT_SOURCE}) = 'dictionary'
   ORDER BY word
   LIMIT 1 OFFSET ?`,
)
const stmtCheck = db.prepare(
  `SELECT 1 AS ok FROM words
   WHERE language_code = ? AND (word = ? OR word = ?) AND (${DICT_SOURCE}) = 'dictionary'
   LIMIT 1`,
)

function utfCodepoints(s) {
  return [...String(s)].map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
}

function parseLang(s) {
  if (s === 'ru' || s === 'en') return s
  return null
}

function parseLength(n) {
  const v = Number(n)
  if (v === 4 || v === 5 || v === 6) return v
  return null
}

/**
 * Очки live-раунда: победа (n попыток, длина len) = (70 - (n-1)*10) + (len-5)*10; поражение = 0.
 * Согласовано с игровой таблицей 4/5/6 букв.
 */
function computeLiveRoundPoints(won, attempts, wordLength) {
  if (!won) {
    if (attempts !== 6) return null
    return 0
  }
  if (attempts < 1 || attempts > 6) return null
  if (wordLength !== 4 && wordLength !== 5 && wordLength !== 6) return null
  return 70 - (attempts - 1) * 10 + (wordLength - 5) * 10
}

const LIVE_ROUND_MS = 3 * 60 * 60 * 1000

function liveRoundIdNow() {
  return Math.floor(Date.now() / LIVE_ROUND_MS)
}

function offsetFromSeed(seed, count) {
  if (!count) return 0
  const buf = createHash('sha256').update(String(seed), 'utf8').digest()
  const n = buf.readUInt32BE(0)
  return n % count
}

function normalizeRuLower(raw) {
  return String(raw).trim().toLowerCase()
}

function normalizeRuUpper(raw) {
  return String(raw).trim().toUpperCase()
}

function normalizeRuForClient(raw) {
  return normalizeRuUpper(raw)
}

function normalizeEnLower(raw) {
  return String(raw).trim().toLowerCase()
}

function normalizeEnUpper(raw) {
  return String(raw).trim().toUpperCase()
}

function normalizeEnForClient(raw) {
  return normalizeEnUpper(raw)
}

function safeEqualUtf8(a, b) {
  const ba = Buffer.from(String(a), 'utf8')
  const bb = Buffer.from(String(b), 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

const stmtRowWordAndSource = db.prepare(
  `SELECT word, (${DICT_SOURCE}) AS src FROM words
   WHERE language_code = ? AND (word = ? OR word = ?) LIMIT 1`,
)

const insertSuggested = db.prepare(
  `INSERT INTO words (language_code, word, source, suggested_at)
   VALUES (?, ?, 'suggested', ?)`,
)
const updateDismissedToSuggested = db.prepare(
  `UPDATE words SET source = 'suggested', suggested_at = ?
   WHERE language_code = ? AND word = ? AND (${DICT_SOURCE}) = 'dismissed'`,
)
const listSuggested = db.prepare(
  `SELECT language_code AS lang, word, suggested_at AS suggestedAt
   FROM words WHERE (${DICT_SOURCE}) = 'suggested'
   ORDER BY suggested_at DESC, language_code, word`,
)
const approveWord = db.prepare(
  `UPDATE words SET source = 'dictionary', suggested_at = NULL
   WHERE language_code = ? AND word = ? AND (${DICT_SOURCE}) = 'suggested'`,
)
const dismissWord = db.prepare(
  `UPDATE words SET source = 'dismissed', suggested_at = NULL
   WHERE language_code = ? AND word = ? AND (${DICT_SOURCE}) = 'suggested'`,
)

const insertDictionaryWord = db.prepare(
  `INSERT INTO words (language_code, word, source, suggested_at)
   VALUES (?, ?, 'dictionary', NULL)`,
)

const deleteDictionaryWord = db.prepare(
  `DELETE FROM words
   WHERE language_code = ? AND word = ? AND (${DICT_SOURCE}) = 'dictionary'`,
)

const ADMIN_IMPORT_MAX_LINES = 20_000
const ADMIN_DICTIONARY_PAGE_MAX = 500
const ADMIN_DICTIONARY_SEARCH_MAX = 64

/**
 * Одна допустимая первая буква для фильтра списка (en: a–z, ru: а–я + ё).
 */
function parseAdminDictionaryPrefix(lang, raw) {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') return null
  const s = String(raw).trim().toLowerCase()
  if (s.length !== 1) return null
  const cp = s.codePointAt(0)
  if (lang === 'en') {
    if (cp >= 0x61 && cp <= 0x7a) return s
    return null
  }
  if (lang === 'ru') {
    if ((cp >= 0x0430 && cp <= 0x044f) || cp === 0x0451) return s
    return null
  }
  return null
}

/** Подстрока поиска по полю word (нижний регистр в БД). */
function parseAdminDictionarySearchNeedle(lang, raw) {
  if (typeof raw !== 'string') return null
  const n = lang === 'ru' ? normalizeRuLower(raw) : normalizeEnLower(raw)
  if (!n) return null
  if (n.length > ADMIN_DICTIONARY_SEARCH_MAX) return n.slice(0, ADMIN_DICTIONARY_SEARCH_MAX)
  return n
}

function adminDictionaryListWhere(lang, length, prefix, needle) {
  const parts = [
    'language_code = ?',
    'length(word) = ?',
    `(${DICT_SOURCE}) = 'dictionary'`,
  ]
  const params = [lang, length]
  if (prefix) {
    parts.push('word LIKE ?')
    params.push(`${prefix}%`)
  }
  if (needle) {
    parts.push('INSTR(word, ?) > 0')
    params.push(needle)
  }
  return { whereSql: parts.join(' AND '), params }
}

/**
 * Импорт слов в playable-словарь (source=dictionary). Уже существующие строки в `words`
 * для той же пары (lang, нормализованное слово) пропускаются с отчётом.
 */
function runAdminWordsImport(lang, rawLines) {
  const added = []
  const alreadyInDatabase = []
  const invalid = []

  const lines = Array.isArray(rawLines) ? rawLines : []
  if (lines.length > ADMIN_IMPORT_MAX_LINES) {
    return {
      ok: false,
      error: 'too_many_lines',
      maxLines: ADMIN_IMPORT_MAX_LINES,
      added: [],
      alreadyInDatabase: [],
      invalid: [],
    }
  }

  const tx = db.transaction(() => {
    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i]
      if (typeof rawLine !== 'string') {
        invalid.push({ raw: String(rawLine), reason: 'bad_line' })
        continue
      }
      const asLower = lang === 'ru' ? normalizeRuLower(rawLine) : normalizeEnLower(rawLine)
      const asUpper = lang === 'ru' ? normalizeRuUpper(rawLine) : normalizeEnUpper(rawLine)
      if (!asLower) {
        invalid.push({ raw: rawLine.trim() || '(empty)', reason: 'empty' })
        continue
      }
      const len = [...asLower].length
      if (len < 4 || len > 6) {
        invalid.push({ raw: rawLine.trim(), reason: 'bad_length' })
        continue
      }
      const storeWord = asLower
      const row = stmtRowWordAndSource.get(lang, asLower, asUpper)
      if (row) {
        alreadyInDatabase.push({
          word: String(storeWord).toUpperCase(),
          source: row.src,
        })
        continue
      }
      try {
        insertDictionaryWord.run(lang, storeWord)
        added.push(String(storeWord).toUpperCase())
      } catch (e) {
        if (String(e?.message ?? e).includes('UNIQUE')) {
          const again = stmtRowWordAndSource.get(lang, asLower, asUpper)
          alreadyInDatabase.push({
            word: String(storeWord).toUpperCase(),
            source: again?.src ?? 'unknown',
          })
        } else {
          invalid.push({ raw: rawLine.trim(), reason: 'insert_failed' })
        }
      }
    }
  })

  tx()

  return {
    ok: true,
    added,
    alreadyInDatabase,
    invalid,
    counts: {
      added: added.length,
      alreadyInDatabase: alreadyInDatabase.length,
      invalid: invalid.length,
    },
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/game/daily', (req, res) => {
  const lang = parseLang(req.query.lang)
  const length = parseLength(req.query.length)
  const mode = req.query.mode === 'practice' ? 'practice' : 'live'
  if (!lang || length === null) {
    res.status(400).json({ error: 'bad_request' })
    return
  }

  const row = stmtCount.get(lang, length)
  const count = row?.c ?? 0
  if (count === 0) {
    res.status(404).json({ error: 'no_words_for_length' })
    return
  }

  let seedForHash = ''
  let liveRoundId = null
  if (mode === 'practice') {
    const seed = typeof req.query.seed === 'string' ? req.query.seed.trim() : ''
    if (!seed) {
      res.status(400).json({ error: 'bad_request' })
      return
    }
    seedForHash = `practice:${seed}`
  } else {
    liveRoundId = liveRoundIdNow()
    seedForHash = `live:${liveRoundId}`
  }

  const offset = offsetFromSeed(seedForHash, count)
  const wordRow = stmtDaily.get(lang, length, offset)
  const word = wordRow?.word
  if (!word || typeof word !== 'string') {
    res.status(500).json({ error: 'internal' })
    return
  }
  const out = lang === 'ru' ? normalizeRuForClient(word) : normalizeEnForClient(word)
  const body = { word: out }
  if (liveRoundId !== null) body.liveRoundId = liveRoundId
  res.json(body)
})

app.post('/api/game/check', (req, res) => {
  const lang = parseLang(req.body?.lang)
  const raw = req.body?.word
  if (!lang || typeof raw !== 'string') {
    if (debugGameCheck) console.warn('[game/check] 400 bad_request (lang/word)', req.body)
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLower = lang === 'ru' ? normalizeRuLower(raw) : normalizeEnLower(raw)
  const asUpper = lang === 'ru' ? normalizeRuUpper(raw) : normalizeEnUpper(raw)
  if (!asLower && !asUpper) {
    if (debugGameCheck) console.warn('[game/check] 400 empty after normalize', { raw })
    res.status(400).json({ error: 'bad_request' })
    return
  }

  const hit = stmtCheck.get(lang, asLower, asUpper)
  const ok = hit?.ok === 1

  if (debugGameCheck) {
    const rowCount = db.prepare(`SELECT COUNT(*) AS c FROM words WHERE language_code = ?`).get(lang)
    const info = {
      lang,
      rawLen: raw.length,
      rawCodepoints: utfCodepoints(raw),
      asLower,
      asUpper,
      asLowerLen: asLower.length,
      dbHit: ok,
      rowsForLang: rowCount?.c,
      triedMatchLower: asLower,
      triedMatchUpper: asUpper,
    }
    if (!ok) {
      const near = db
        .prepare(
          `SELECT word FROM words
           WHERE language_code = ? AND length(word) = ? AND (${DICT_SOURCE}) = 'dictionary'
           AND word LIKE ?
           LIMIT 5`,
        )
        .all(lang, asLower.length, `${asLower.slice(0, 3)}%`)
      info.sampleSameLengthPrefix = near.map((r) => r.word)
    }
    console.warn('[game/check]', JSON.stringify(info, null, 0))
  }

  const body = { ok: Boolean(ok) }
  if (debugGameCheck) {
    body._debug = {
      asLower,
      asUpper,
      rawLen: raw.length,
      rawCodepoints: utfCodepoints(raw),
      dbHit: ok,
    }
  }
  res.json(body)
})

app.post('/api/game/submit-live-score', (req, res) => {
  const userId = readAuthedUserId(req)
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const lang = parseLang(req.body?.lang)
  const length = parseLength(req.body?.length)
  const liveRoundIdRaw = req.body?.liveRoundId
  const won = req.body?.won
  const attemptsRaw = req.body?.attempts

  if (
    !lang ||
    length === null ||
    typeof liveRoundIdRaw !== 'number' ||
    !Number.isFinite(liveRoundIdRaw)
  ) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const liveRoundId = Math.trunc(liveRoundIdRaw)
  if (Math.abs(liveRoundId) > 1e15) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  if (won !== true && won !== false) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  if (typeof attemptsRaw !== 'number' || !Number.isFinite(attemptsRaw)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const attempts = Math.trunc(attemptsRaw)
  if (attempts !== attemptsRaw || attempts < 1 || attempts > 6) {
    res.status(400).json({ error: 'bad_request' })
    return
  }

  const solveDurationMsRaw = req.body?.solveDurationMs
  if (typeof solveDurationMsRaw !== 'number' || !Number.isFinite(solveDurationMsRaw)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const solveDurationMs = Math.trunc(solveDurationMsRaw)
  // Ограничиваем на всякий случай: 0..1e9ms (около 11.6 дней).
  if (solveDurationMs !== solveDurationMsRaw || solveDurationMs < 0 || solveDurationMs > 1e9) {
    res.status(400).json({ error: 'bad_request' })
    return
  }

  const nowRound = liveRoundIdNow()
  if (liveRoundId > nowRound + 3) {
    res.status(400).json({ error: 'future_round' })
    return
  }
  if (liveRoundId < nowRound - 10000) {
    res.status(400).json({ error: 'round_too_old' })
    return
  }

  if (!won && attempts !== 6) {
    res.status(400).json({ error: 'bad_attempts' })
    return
  }

  const points = computeLiveRoundPoints(won, attempts, length)
  if (points === null) {
    res.status(400).json({ error: 'bad_attempts' })
    return
  }

  const recordedAt = Math.floor(Date.now() / 1000)
  const existing = stmtSelectLiveScore.get(userId, liveRoundId, lang, length)
  if (existing) {
    res.json({
      ok: true,
      duplicate: true,
      points: existing.points,
      won: Boolean(existing.won),
      attempts: existing.attempts,
    })
    return
  }

  try {
    stmtInsertLiveScore.run(
      userId,
      liveRoundId,
      lang,
      length,
      won ? 1 : 0,
      attempts,
      points,
      recordedAt,
      solveDurationMs,
    )
  } catch (e) {
    if (String(e?.message ?? e).includes('UNIQUE')) {
      const row = stmtSelectLiveScore.get(userId, liveRoundId, lang, length)
      if (row) {
        res.json({
          ok: true,
          duplicate: true,
          points: row.points,
          won: Boolean(row.won),
          attempts: row.attempts,
        })
        return
      }
    }
    console.error('[submit-live-score]', e)
    res.status(500).json({ error: 'internal' })
    return
  }

  res.json({ ok: true, duplicate: false, points, won, attempts })
})

app.post('/api/game/suggest', (req, res) => {
  const lang = parseLang(req.body?.lang)
  const raw = req.body?.word
  if (!lang || typeof raw !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLower = lang === 'ru' ? normalizeRuLower(raw) : normalizeEnLower(raw)
  const asUpper = lang === 'ru' ? normalizeRuUpper(raw) : normalizeEnUpper(raw)
  const len = [...asLower].length
  if (len < 4 || len > 6) {
    res.status(400).json({ error: 'bad_length' })
    return
  }

  const storeWord = asLower
  const existing = stmtRowWordAndSource.get(lang, asLower, asUpper)
  const src = existing?.src

  if (src === 'dictionary') {
    res.status(409).json({ error: 'already_in_dictionary' })
    return
  }
  if (src === 'suggested') {
    res.json({ ok: true, status: 'already_suggested' })
    return
  }

  const now = Math.floor(Date.now() / 1000)
  try {
    if (src === 'dismissed' && existing?.word) {
      updateDismissedToSuggested.run(now, lang, existing.word)
      res.json({ ok: true, status: 'resubmitted' })
      return
    }
    insertSuggested.run(lang, storeWord, now)
    res.json({ ok: true, status: 'created' })
  } catch (e) {
    if (String(e?.message ?? e).includes('UNIQUE')) {
      res.json({ ok: true, status: 'already_suggested' })
      return
    }
    console.error('[suggest]', e)
    res.status(500).json({ error: 'internal' })
  }
})

app.get('/api/admin/me', (req, res) => {
  const p = adminPublicState(req)
  res.json({ ok: true, ...p })
})

app.post('/api/admin/register', (req, res) => {
  const key = getEncryptionKey()
  if (!key) {
    res.status(503).json({ error: 'encryption_not_configured' })
    return
  }
  if (hasAdminCredentialsRow()) {
    res.status(403).json({ error: 'already_registered' })
    return
  }
  const username = req.body?.username
  const password = req.body?.password
  const passwordConfirm = req.body?.passwordConfirm
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const u = username.trim()
  if (u.length < 1 || u.length > 128) {
    res.status(400).json({ error: 'bad_username' })
    return
  }
  if (password.length < 1 || password.length > 256) {
    res.status(400).json({ error: 'bad_password' })
    return
  }
  if (typeof passwordConfirm !== 'string' || passwordConfirm !== password) {
    res.status(400).json({ error: 'password_mismatch' })
    return
  }
  const usernameEnc = encryptField(u, key)
  const passwordEnc = encryptField(password, key)
  try {
    db.prepare(
      'INSERT INTO admin_credentials (id, username_enc, password_enc) VALUES (1, ?, ?)',
    ).run(usernameEnc, passwordEnc)
  } catch (e) {
    console.error('[admin/register]', e)
    res.status(500).json({ error: 'internal' })
    return
  }
  const token = randomBytes(32).toString('hex')
  adminSessions.set(token, Date.now() + SESSION_MS)
  setSessionCookie(res, token)
  res.json({ ok: true })
})

app.post('/api/admin/login', (req, res) => {
  const key = getEncryptionKey()
  if (!key) {
    res.status(503).json({ error: 'encryption_not_configured' })
    return
  }
  if (!hasAdminCredentialsRow()) {
    res.status(503).json({ error: 'registration_required' })
    return
  }
  const cred = loadAdminUserPass()
  if (!cred) {
    res.status(503).json({ error: 'admin_not_configured' })
    return
  }
  const u = req.body?.username
  const p = req.body?.password
  if (typeof u !== 'string' || typeof p !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const uOk = safeEqualUtf8(u, cred.username)
  const pOk = safeEqualUtf8(p, cred.password)
  if (!uOk || !pOk) {
    res.status(401).json({ error: 'invalid_credentials' })
    return
  }
  const token = randomBytes(32).toString('hex')
  adminSessions.set(token, Date.now() + SESSION_MS)
  setSessionCookie(res, token)
  res.json({ ok: true })
})

app.post('/api/admin/logout', (req, res) => {
  const t = readAdminSession(req)
  if (t) adminSessions.delete(t)
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const key = getEncryptionKey()
  if (!key) {
    res.status(503).json({ error: 'encryption_not_configured' })
    return
  }
  const cred = loadAdminUserPass()
  if (!cred) {
    res.status(503).json({ error: 'admin_not_configured' })
    return
  }
  const currentPassword = req.body?.currentPassword
  const newPassword = req.body?.newPassword
  const newPasswordConfirm = req.body?.newPasswordConfirm
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  if (!safeEqualUtf8(currentPassword, cred.password)) {
    res.status(401).json({ error: 'wrong_current_password' })
    return
  }
  if (newPassword.length < 1 || newPassword.length > 256) {
    res.status(400).json({ error: 'bad_password' })
    return
  }
  if (typeof newPasswordConfirm !== 'string' || newPasswordConfirm !== newPassword) {
    res.status(400).json({ error: 'password_mismatch' })
    return
  }
  const passwordEnc = encryptField(newPassword, key)
  try {
    const info = db
      .prepare('UPDATE admin_credentials SET password_enc = ? WHERE id = 1')
      .run(passwordEnc)
    if (info.changes === 0) {
      res.status(503).json({ error: 'admin_not_configured' })
      return
    }
  } catch (e) {
    console.error('[admin/change-password]', e)
    res.status(500).json({ error: 'internal' })
    return
  }
  res.json({ ok: true })
})

app.get('/api/user/me', (req, res) => {
  const s = readUserSessionData(req)
  if (!s) {
    res.json({ ok: true, authed: false, user: null, totalLiveScore: null })
    return
  }
  const totalRow = stmtSumUserLiveScore.get(s.userId)
  const totalLiveScore = Number(totalRow?.total ?? 0)
  res.json({
    ok: true,
    authed: true,
    user: { id: s.userId, username: s.username },
    totalLiveScore,
  })
})

app.post('/api/user/register', (req, res) => {
  const username = req.body?.username
  const password = req.body?.password
  const passwordConfirm = req.body?.passwordConfirm
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const u = normalizeUsername(username)
  if (!isValidUsername(u)) {
    res.status(400).json({ error: 'bad_username' })
    return
  }
  if (password.length < 6 || password.length > 256) {
    res.status(400).json({ error: 'bad_password' })
    return
  }
  if (typeof passwordConfirm !== 'string' || passwordConfirm !== password) {
    res.status(400).json({ error: 'password_mismatch' })
    return
  }
  if (stmtUserByUsername.get(u)) {
    res.status(409).json({ error: 'username_taken' })
    return
  }
  const hash = hashUserPassword(password)
  const now = Math.floor(Date.now() / 1000)
  let info
  try {
    info = stmtInsertUser.run(u, hash, now)
  } catch (e) {
    if (String(e?.message ?? e).includes('UNIQUE')) {
      res.status(409).json({ error: 'username_taken' })
      return
    }
    console.error('[user/register]', e)
    res.status(500).json({ error: 'internal' })
    return
  }
  const userId = Number(info.lastInsertRowid)
  issueUserSession(res, userId, u)
  res.json({ ok: true, user: { id: userId, username: u } })
})

app.post('/api/user/login', (req, res) => {
  const username = req.body?.username
  const password = req.body?.password
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const u = normalizeUsername(username)
  const row = stmtUserByUsername.get(u)
  if (!row || !verifyUserPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'invalid_credentials' })
    return
  }
  issueUserSession(res, row.id, row.username)
  res.json({ ok: true, user: { id: row.id, username: row.username } })
})

app.post('/api/user/logout', (req, res) => {
  const s = readUserSessionData(req)
  if (s) userSessions.delete(s.token)
  clearUserSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/leaderboard/month', (_req, res) => {
  const now = new Date()
  // Граница месяца считаем в UTC, чтобы не зависеть от часового пояса сервера.
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)
  const startUnix = Math.floor(startMs / 1000)
  const endUnix = Math.floor(endMs / 1000)

  const rows = stmtMonthlyTop3.all(startUnix, endUnix)

  const items = rows.map((r) => ({
    username: r.username,
    points: Number(r.total ?? 0),
  }))
  res.json({ ok: true, items })
})

app.get('/api/admin/suggestions', requireAdmin, (_req, res) => {
  const rows = listSuggested.all()
  const items = rows.map((r) => ({
    lang: r.lang,
    word: r.word,
    suggestedAt: r.suggestedAt ?? null,
  }))
  res.json({ ok: true, items })
})

app.post('/api/admin/suggestions/approve', requireAdmin, (req, res) => {
  const lang = parseLang(req.body?.lang)
  const w = req.body?.word
  if (!lang || typeof w !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLower = lang === 'ru' ? normalizeRuLower(w) : normalizeEnLower(w)
  const asUpper = lang === 'ru' ? normalizeRuUpper(w) : normalizeEnUpper(w)
  const row = stmtRowWordAndSource.get(lang, asLower, asUpper)
  if (!row?.word || row.src !== 'suggested') {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const info = approveWord.run(lang, row.word)
  if (info.changes === 0) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true })
})

app.post('/api/admin/suggestions/dismiss', requireAdmin, (req, res) => {
  const lang = parseLang(req.body?.lang)
  const w = req.body?.word
  if (!lang || typeof w !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLower = lang === 'ru' ? normalizeRuLower(w) : normalizeEnLower(w)
  const asUpper = lang === 'ru' ? normalizeRuUpper(w) : normalizeEnUpper(w)
  const row = stmtRowWordAndSource.get(lang, asLower, asUpper)
  if (!row?.word || row.src !== 'suggested') {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const info = dismissWord.run(lang, row.word)
  if (info.changes === 0) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true })
})

app.post('/api/admin/words/import', requireAdmin, (req, res) => {
  const lang = parseLang(req.body?.lang)
  const text = req.body?.text
  const linesRaw = req.body?.lines
  if (!lang) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  let lines
  if (Array.isArray(linesRaw)) {
    lines = linesRaw
  } else if (typeof text === 'string') {
    lines = text.split(/\r\n|\n|\r/)
  } else {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const result = runAdminWordsImport(lang, lines)
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

app.get('/api/admin/dictionary/words', requireAdmin, (req, res) => {
  const lang = parseLang(req.query.lang)
  const length = parseLength(req.query.length)
  if (!lang || length === null) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  let limit = Number(req.query.limit)
  let offset = Number(req.query.offset)
  if (!Number.isFinite(limit) || limit < 1) limit = 200
  if (limit > ADMIN_DICTIONARY_PAGE_MAX) limit = ADMIN_DICTIONARY_PAGE_MAX
  if (!Number.isFinite(offset) || offset < 0) offset = 0
  limit = Math.floor(limit)
  offset = Math.floor(offset)

  const prefix =
    typeof req.query.prefix === 'string' && req.query.prefix.trim() !== ''
      ? parseAdminDictionaryPrefix(lang, req.query.prefix)
      : null
  const needle =
    typeof req.query.q === 'string' && req.query.q.trim() !== ''
      ? parseAdminDictionarySearchNeedle(lang, req.query.q)
      : null

  const { whereSql, params } = adminDictionaryListWhere(lang, length, prefix, needle)
  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM words WHERE ${whereSql}`).get(...params)
  const total = countRow?.c ?? 0
  const rows = db
    .prepare(`SELECT word FROM words WHERE ${whereSql} ORDER BY word LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
  const items = rows.map((r) => r.word)
  res.json({ ok: true, items, total, limit, offset })
})

app.delete('/api/admin/dictionary/words', requireAdmin, (req, res) => {
  const lang = parseLang(req.body?.lang)
  const w = req.body?.word
  if (!lang || typeof w !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLower = lang === 'ru' ? normalizeRuLower(w) : normalizeEnLower(w)
  const asUpper = lang === 'ru' ? normalizeRuUpper(w) : normalizeEnUpper(w)
  const row = stmtRowWordAndSource.get(lang, asLower, asUpper)
  if (!row?.word || row.src !== 'dictionary') {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const info = deleteDictionaryWord.run(lang, row.word)
  if (info.changes === 0) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true })
})

app.patch('/api/admin/dictionary/words', requireAdmin, (req, res) => {
  const lang = parseLang(req.body?.lang)
  const wOld = req.body?.word
  const wNewRaw = req.body?.newWord
  if (!lang || typeof wOld !== 'string' || typeof wNewRaw !== 'string') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const asLowerOld = lang === 'ru' ? normalizeRuLower(wOld) : normalizeEnLower(wOld)
  const asUpperOld = lang === 'ru' ? normalizeRuUpper(wOld) : normalizeEnUpper(wOld)
  const row = stmtRowWordAndSource.get(lang, asLowerOld, asUpperOld)
  if (!row?.word || row.src !== 'dictionary') {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const storedOld = row.word
  const asLowerNew = lang === 'ru' ? normalizeRuLower(wNewRaw) : normalizeEnLower(wNewRaw)
  const asUpperNew = lang === 'ru' ? normalizeRuUpper(wNewRaw) : normalizeEnUpper(wNewRaw)
  if (!asLowerNew) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const lenNew = [...asLowerNew].length
  if (lenNew < 4 || lenNew > 6) {
    res.status(400).json({ error: 'bad_length' })
    return
  }
  if (asLowerNew === storedOld) {
    res.json({ ok: true, word: storedOld })
    return
  }
  const clash = stmtRowWordAndSource.get(lang, asLowerNew, asUpperNew)
  if (clash) {
    res.status(409).json({ error: 'conflict' })
    return
  }
  try {
    const tx = db.transaction(() => {
      const d = deleteDictionaryWord.run(lang, storedOld)
      if (d.changes !== 1) {
        throw new Error('delete_failed')
      }
      insertDictionaryWord.run(lang, asLowerNew)
    })
    tx()
  } catch (e) {
    console.error('[admin/dictionary/patch]', e)
    res.status(500).json({ error: 'internal' })
    return
  }
  res.json({ ok: true, word: asLowerNew })
})

app.listen(port, host, () => {
  console.log(`Словарь (RW): ${dbPath}`)
  console.log(`API http://${host}:${port}`)
  console.log(
    `[dayword] DEBUG_GAME_CHECK в process.env = ${JSON.stringify(process.env.DEBUG_GAME_CHECK ?? '')} → ${debugGameCheck ? 'логи ВКЛ (каждый /api/*)' : 'логи ВЫКЛ'}`,
  )
  if (debugGameCheck) {
    console.warn(
      '[dayword] Логи проверки слова — в ЭТОМ терминале (не в DevTools). Срабатывают при Enter (ru/en), не при наборе букв.',
    )
  }
  if (!getEncryptionKey()) {
    console.warn('[dayword] ADMIN_ENCRYPTION_KEY не задан (64 hex) — админка недоступна.')
  } else if (!hasAdminCredentialsRow()) {
    console.warn(
      '[dayword] Первый запуск админки: откройте #/login (Аккаунт) и зарегистрируйте учётную запись администратора.',
    )
  }
})
