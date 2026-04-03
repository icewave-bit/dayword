import { useCallback, useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import {
  adminApproveSuggestion,
  adminDismissSuggestion,
  adminListSuggestions,
  adminLogout,
  adminMe,
  type AdminMeState,
  type AdminSuggestion,
} from '../lib/api'
import { localeAtom } from '../atoms'
import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'

function displayWord(_lang: 'ru' | 'en', stored: string): string {
  return stored.toUpperCase()
}

function formatWhen(locale: Locale, unix: number | null): string {
  if (unix === null) return '—'
  const d = new Date(unix * 1000)
  return d.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')
}

export function AdminConsole() {
  const locale = useAtomValue(localeAtom)
  const c = t(locale)
  const [me, setMe] = useState<AdminMeState | null>(null)
  const [bootErr, setBootErr] = useState(false)

  const [items, setItems] = useState<AdminSuggestion[]>([])
  const [listErr, setListErr] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const refreshMe = useCallback(() => {
    setBootErr(false)
    return adminMe()
      .then(setMe)
      .catch(() => {
        setBootErr(true)
        setMe(null)
      })
  }, [])

  const loadList = useCallback(() => {
    setListErr(null)
    void adminListSuggestions()
      .then(setItems)
      .catch((e) => setListErr(e instanceof Error ? e.message : 'error'))
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  useEffect(() => {
    if (me === null && !bootErr) return
    if (bootErr) return
    if (!me) return
    if (!me.encryptionConfigured || !me.authed) {
      window.location.replace('#/login')
    }
  }, [me, bootErr])

  useEffect(() => {
    if (me?.authed) loadList()
  }, [me?.authed, loadList])

  const onLogout = () => {
    void adminLogout().then(() => {
      setItems([])
      window.location.replace('#/login')
    })
  }

  const rowKey = (x: AdminSuggestion) => `${x.lang}:${x.word}`

  const onApprove = (x: AdminSuggestion) => {
    const k = rowKey(x)
    setBusyKey(k)
    void adminApproveSuggestion(x.lang, x.word)
      .then(() => setItems((prev) => prev.filter((i) => rowKey(i) !== k)))
      .catch(() => setListErr('approve'))
      .finally(() => setBusyKey(null))
  }

  const onDismiss = (x: AdminSuggestion) => {
    const k = rowKey(x)
    setBusyKey(k)
    void adminDismissSuggestion(x.lang, x.word)
      .then(() => setItems((prev) => prev.filter((i) => rowKey(i) !== k)))
      .catch(() => setListErr('dismiss'))
      .finally(() => setBusyKey(null))
  }

  if (me === null && !bootErr) {
    return (
      <main className="app admin-console">
        <p className="message">{c.loadingGame}</p>
      </main>
    )
  }

  if (bootErr || me === null) {
    return (
      <main className="app admin-console">
        <header>
          <h1>{c.adminTitle}</h1>
          <p>
            <a href="#/login" className="admin-back-link">
              {c.authHubTitle}
            </a>
          </p>
        </header>
        <p className="message">{c.adminLoadError}</p>
        <button type="button" className="primary-action" onClick={() => void refreshMe()}>
          {c.retryLoad}
        </button>
      </main>
    )
  }

  if (!me.encryptionConfigured || !me.authed) {
    return (
      <main className="app admin-console">
        <p className="message">{c.loadingGame}</p>
      </main>
    )
  }

  return (
    <main className="app admin-console">
      <header>
        <h1>{c.adminTitle}</h1>
        <p>
          <a href="#/" className="admin-back-link">
            {c.adminBackToGame}
          </a>
        </p>
      </header>

      <div className="admin-toolbar">
        <button type="button" className="secondary" onClick={onLogout}>
          {c.adminLogout}
        </button>
        <button type="button" className="secondary" onClick={() => loadList()}>
          {c.retryLoad}
        </button>
        <a className="admin-footer-link" href="#/login">
          {c.authHubTitle}
        </a>
      </div>
      {listErr ? <p className="message admin-list-error">{c.adminLoadError}</p> : null}
      {items.length === 0 ? (
        <p className="message">{c.adminEmptyList}</p>
      ) : (
        <ul className="admin-suggestion-list">
          {items.map((x) => {
            const k = rowKey(x)
            const busy = busyKey === k
            return (
              <li key={k} className="admin-suggestion-row">
                <div className="admin-suggestion-meta">
                  <span className="admin-suggestion-word">{displayWord(x.lang, x.word)}</span>
                  <span className="admin-suggestion-lang">
                    {c.adminLang}: {x.lang.toUpperCase()}
                  </span>
                  <span className="admin-suggestion-time">
                    {c.adminSuggestedAt}: {formatWhen(locale, x.suggestedAt)}
                  </span>
                </div>
                <div className="admin-suggestion-actions">
                  <button
                    type="button"
                    className="primary-action small"
                    disabled={busy}
                    onClick={() => onApprove(x)}
                  >
                    {c.adminApprove}
                  </button>
                  <button
                    type="button"
                    className="secondary small"
                    disabled={busy}
                    onClick={() => onDismiss(x)}
                  >
                    {c.adminDismiss}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
