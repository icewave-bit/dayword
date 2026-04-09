import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAtom } from 'jotai'
import {
  adminDictionaryLangAtom,
  adminDictionaryLengthAtom,
  adminDictionaryPageAtom,
  adminDictionaryPrefixAtom,
  adminDictionarySearchAppliedAtom,
} from '../atoms'
import {
  adminDeleteDictionaryWord,
  adminListDictionaryWords,
  adminUpdateDictionaryWord,
} from '../lib/api'
import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'
import type { WordLength } from '../lib/words'
import { SegmentTabs } from './SegmentTabs'

type Props = {
  locale: Locale
}

const PAGE_SIZE = 25

const DICTIONARY_LETTERS_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const DICTIONARY_LETTERS_RU = [
  'А',
  'Б',
  'В',
  'Г',
  'Д',
  'Е',
  'Ё',
  'Ж',
  'З',
  'И',
  'Й',
  'К',
  'Л',
  'М',
  'Н',
  'О',
  'П',
  'Р',
  'С',
  'Т',
  'У',
  'Ф',
  'Х',
  'Ц',
  'Ч',
  'Ш',
  'Щ',
  'Ъ',
  'Ы',
  'Ь',
  'Э',
  'Ю',
  'Я',
]

function displayStored(stored: string): string {
  return stored.toUpperCase()
}

/** Одна буква с кнопки → нижний регистр для сравнения с префиксом в атоме. */
function charToPrefix(letter: string): string {
  const g = [...letter][0] ?? ''
  return g.toLowerCase()
}

function IconEditWord() {
  return (
    <svg
      className="admin-dictionary-icon-svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function IconDeleteWord() {
  return (
    <svg
      className="admin-dictionary-icon-svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  )
}

export function AdminDictionaryWordsPanel({ locale }: Props) {
  const c = t(locale)
  const [lang, setLang] = useAtom(adminDictionaryLangAtom)
  const [wordLength, setWordLength] = useAtom(adminDictionaryLengthAtom)
  const [page, setPage] = useAtom(adminDictionaryPageAtom)
  const [prefix, setPrefix] = useAtom(adminDictionaryPrefixAtom)
  const [searchApplied, setSearchApplied] = useAtom(adminDictionarySearchAppliedAtom)

  const [searchDraft, setSearchDraft] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [busyRow, setBusyRow] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ word: string; draft: string } | null>(null)

  const langLenKey = `${lang}:${wordLength}`
  const prevLangLenKey = useRef<string | null>(null)

  const letterRow = lang === 'en' ? DICTIONARY_LETTERS_EN : DICTIONARY_LETTERS_RU
  const hasFilters = Boolean(prefix || searchApplied.trim())

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  const rangeLabel = useMemo(() => {
    const copy = t(locale)
    if (total === 0 || items.length === 0) {
      return copy.adminDictionaryRangePage(0, 0, total, page, totalPages)
    }
    const from = (page - 1) * PAGE_SIZE + 1
    const to = (page - 1) * PAGE_SIZE + items.length
    return copy.adminDictionaryRangePage(from, to, total, page, totalPages)
  }, [locale, items.length, page, total, totalPages])

  useEffect(() => {
    if (prevLangLenKey.current !== langLenKey) {
      prevLangLenKey.current = langLenKey
      setPrefix(null)
      setSearchApplied('')
      setSearchDraft('')
      setPage(1)
    }
  }, [langLenKey, setPage, setPrefix, setSearchApplied])

  useEffect(() => {
    let cancelled = false
    setEditing(null)
    setActionErr(null)
    setLoading(true)
    setListErr(false)
    ;(async () => {
      try {
        const offset = (page - 1) * PAGE_SIZE
        const data = await adminListDictionaryWords({
          lang,
          length: wordLength,
          limit: PAGE_SIZE,
          offset,
          prefix: prefix ?? undefined,
          q: searchApplied.trim() || undefined,
        })
        if (cancelled) return
        if (data.items.length === 0 && data.total > 0 && page > 1) {
          setPage(page - 1)
          return
        }
        const maxPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
        if (page > maxPage) {
          setPage(maxPage)
          return
        }
        setItems(data.items)
        setTotal(data.total)
      } catch {
        if (!cancelled) {
          setListErr(true)
          setItems([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lang, wordLength, page, prefix, searchApplied, setPage])

  const refetchAfterMutation = useCallback(async () => {
    const offset = (page - 1) * PAGE_SIZE
    try {
      const data = await adminListDictionaryWords({
        lang,
        length: wordLength,
        limit: PAGE_SIZE,
        offset,
        prefix: prefix ?? undefined,
        q: searchApplied.trim() || undefined,
      })
      if (data.items.length === 0 && data.total > 0 && page > 1) {
        setPage(page - 1)
        return
      }
      const maxPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
      if (page > maxPage) {
        setPage(maxPage)
        return
      }
      setItems(data.items)
      setTotal(data.total)
    } catch {
      setListErr(true)
    }
  }, [lang, wordLength, page, prefix, searchApplied, setPage])

  const onLetterClick = (letter: string) => {
    const p = charToPrefix(letter)
    setPrefix((prev) => (prev === p ? null : p))
    setPage(1)
  }

  const onAllLettersClick = () => {
    setPrefix(null)
    setPage(1)
  }

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSearchApplied(searchDraft.trim())
    setPage(1)
  }

  const onSearchClear = () => {
    setSearchDraft('')
    setSearchApplied('')
    setPage(1)
  }

  const onDelete = (stored: string) => {
    setActionErr(null)
    setBusyRow(stored)
    void adminDeleteDictionaryWord(lang, stored)
      .then(() => {
        if (editing?.word === stored) setEditing(null)
        return refetchAfterMutation()
      })
      .catch((e) => {
        setActionErr(
          e instanceof Error && e.message === 'not_found'
            ? c.adminDictionaryErrorNotFound
            : c.adminDictionaryErrorGeneric,
        )
      })
      .finally(() => setBusyRow(null))
  }

  const onStartEdit = (stored: string) => {
    setActionErr(null)
    setEditing({ word: stored, draft: displayStored(stored) })
  }

  const onCancelEdit = () => setEditing(null)

  const onSaveEdit = () => {
    if (!editing) return
    setActionErr(null)
    const oldStored = editing.word
    setBusyRow(oldStored)
    void adminUpdateDictionaryWord({
      lang,
      word: oldStored,
      newWord: editing.draft,
    })
      .then(() => {
        setEditing(null)
        return refetchAfterMutation()
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : ''
        if (msg === 'conflict') setActionErr(c.adminDictionaryErrorConflict)
        else if (msg === 'not_found') setActionErr(c.adminDictionaryErrorNotFound)
        else if (msg === 'bad_length') setActionErr(c.adminDictionaryErrorBadLength)
        else setActionErr(c.adminDictionaryErrorGeneric)
      })
      .finally(() => setBusyRow(null))
  }

  const lengthTabValue = String(wordLength) as '4' | '5' | '6'

  const listArea =
    loading && items.length === 0 ? (
      <p className="message">{c.loadingGame}</p>
    ) : items.length === 0 ? (
      <p className="message">
        {hasFilters ? c.adminDictionaryNoMatches : c.adminDictionaryEmpty}
      </p>
    ) : (
      <ul className="admin-dictionary-list">
        {items.map((stored) => {
          const k = `${lang}:${wordLength}:${stored}`
          const busy = busyRow === stored
          const isEdit = editing?.word === stored
          return (
            <li key={k} className="admin-dictionary-row">
              {isEdit ? (
                <div className="admin-dictionary-edit">
                  <label className="admin-dictionary-edit-label" htmlFor={`edit-${k}`}>
                    {c.adminDictionaryNewWordLabel}
                  </label>
                  <input
                    id={`edit-${k}`}
                    className="admin-dictionary-input"
                    value={editing.draft}
                    onChange={(e) => setEditing({ word: stored, draft: e.target.value })}
                    disabled={busy}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <div className="admin-dictionary-edit-actions">
                    <button
                      type="button"
                      className="primary-action small admin-dictionary-btn-compact"
                      disabled={busy}
                      onClick={onSaveEdit}
                    >
                      {c.adminDictionarySave}
                    </button>
                    <button
                      type="button"
                      className="secondary small admin-dictionary-btn-compact"
                      disabled={busy}
                      onClick={onCancelEdit}
                    >
                      {c.adminDictionaryCancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-dictionary-view">
                  <span className="admin-dictionary-word">{displayStored(stored)}</span>
                  <div className="admin-dictionary-actions">
                    <button
                      type="button"
                      className="secondary admin-dictionary-icon-btn"
                      disabled={busy || editing !== null}
                      onClick={() => onStartEdit(stored)}
                      aria-label={c.adminDictionaryEdit}
                      title={c.adminDictionaryEdit}
                    >
                      <IconEditWord />
                    </button>
                    <button
                      type="button"
                      className="secondary admin-dictionary-icon-btn"
                      disabled={busy || editing !== null}
                      onClick={() => onDelete(stored)}
                      aria-label={c.adminDictionaryDelete}
                      title={c.adminDictionaryDelete}
                    >
                      <IconDeleteWord />
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )

  return (
    <div className="admin-dictionary-panel">
      <p className="message admin-dictionary-intro">{c.adminDictionarySectionLabel}</p>

      <div className="admin-dictionary-controls">
        <div className="admin-dictionary-lang-row">
          <span className="admin-import-label">{c.adminImportLangLabel}</span>
          <SegmentTabs
            ariaLabel={c.adminImportLangLabel}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ru', label: c.langRu },
              { value: 'en', label: c.langEn },
            ]}
          />
        </div>
        <div className="admin-dictionary-length-row">
          <span className="admin-import-label">{c.adminDictionaryLengthTabsLabel}</span>
          <SegmentTabs
            ariaLabel={c.adminDictionaryLengthTabsLabel}
            value={lengthTabValue}
            onChange={(v) => setWordLength(Number(v) as WordLength)}
            options={[
              { value: '4', label: c.lettersN(4) },
              { value: '5', label: c.lettersN(5) },
              { value: '6', label: c.lettersN(6) },
            ]}
          />
        </div>
      </div>

      <div className="admin-dictionary-letter-toolbar" role="group" aria-label={c.adminDictionaryLettersAria}>
        <button
          type="button"
          className={`secondary admin-dictionary-letter-btn admin-dictionary-letter-all${prefix === null ? ' admin-dictionary-letter-btn-active' : ''}`.trim()}
          onClick={onAllLettersClick}
        >
          {c.adminDictionaryAllLetters}
        </button>
        <div className="admin-dictionary-letter-strip">
          {letterRow.map((letter) => {
            const p = charToPrefix(letter)
            const active = prefix === p
            return (
              <button
                key={letter}
                type="button"
                className={`secondary admin-dictionary-letter-btn${active ? ' admin-dictionary-letter-btn-active' : ''}`.trim()}
                onClick={() => onLetterClick(letter)}
                aria-pressed={active}
                aria-label={letter}
              >
                {letter}
              </button>
            )
          })}
        </div>
      </div>

      <form
        className="admin-dictionary-search"
        onSubmit={onSearchSubmit}
        aria-label={c.adminDictionarySearchAria}
      >
        <label className="admin-dictionary-search-label" htmlFor="admin-dictionary-search-input">
          {c.adminDictionarySearchLabel}
        </label>
        <div className="admin-dictionary-search-row">
          <input
            id="admin-dictionary-search-input"
            className="admin-dictionary-search-input"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={c.adminDictionarySearchPlaceholder}
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="primary-action small admin-dictionary-search-submit">
            {c.adminDictionarySearchSubmit}
          </button>
          {(searchDraft.trim() !== '' || searchApplied.trim() !== '') && (
            <button type="button" className="secondary small admin-dictionary-search-clear" onClick={onSearchClear}>
              {c.adminDictionarySearchClear}
            </button>
          )}
        </div>
      </form>

      {listErr ? <p className="message admin-list-error">{c.adminLoadError}</p> : null}
      {actionErr ? <p className="message admin-list-error">{actionErr}</p> : null}

      {!listErr ? (
        <>
          <nav className="admin-dictionary-pagination" aria-label={c.adminDictionaryPaginationAria}>
            <button
              type="button"
              className="secondary admin-dictionary-page-btn"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {c.adminDictionaryPrev}
            </button>
            <span className="admin-dictionary-page-info">{rangeLabel}</span>
            <button
              type="button"
              className="secondary admin-dictionary-page-btn"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {c.adminDictionaryNext}
            </button>
          </nav>
          {listArea}
        </>
      ) : null}
    </div>
  )
}
