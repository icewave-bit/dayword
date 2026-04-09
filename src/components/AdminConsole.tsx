import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  adminApproveSuggestion,
  adminDismissSuggestion,
  adminListSuggestions,
  adminLogout,
  adminMe,
  type AdminMeState,
  type AdminSuggestion,
} from '../lib/api'
import {
  adminConsoleSectionAtom,
  adminSettingsOpenAtom,
  adminSuggestionsLangTabAtom,
  localeAtom,
} from '../atoms'
import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'
import { AdminChangePasswordForm } from './AdminChangePasswordForm'
import { AdminDictionaryWordsPanel } from './AdminDictionaryWords'
import { AdminImportWordsPanel } from './AdminImportWords'
import { SegmentTabs } from './SegmentTabs'

function displayWord(_lang: 'ru' | 'en', stored: string): string {
  return stored.toUpperCase()
}

function formatWhen(locale: Locale, unix: number | null): string {
  if (unix === null) return '—'
  const d = new Date(unix * 1000)
  return d.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')
}

function AdminSettingsGearIcon() {
  return (
    <svg
      className="admin-settings-gear-svg"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function AdminConsole() {
  const locale = useAtomValue(localeAtom)
  const [adminSection, setAdminSection] = useAtom(adminConsoleSectionAtom)
  const [suggestionsLangTab, setSuggestionsLangTab] = useAtom(adminSuggestionsLangTabAtom)
  const [adminSettingsOpen, setAdminSettingsOpen] = useAtom(adminSettingsOpenAtom)
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

  const filteredItems = useMemo(
    () => items.filter((x) => x.lang === suggestionsLangTab),
    [items, suggestionsLangTab],
  )

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
        <div className="admin-top-bar">
          <a href="#/" className="admin-back-link admin-top-bar-home">
            {c.adminHome}
          </a>
        </div>
        <p className="message">{c.loadingGame}</p>
      </main>
    )
  }

  if (bootErr || me === null) {
    return (
      <main className="app admin-console">
        <div className="admin-top-bar">
          <a href="#/" className="admin-back-link admin-top-bar-home">
            {c.adminHome}
          </a>
        </div>
        <header>
          <h1>{c.adminTitle}</h1>
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
        <div className="admin-top-bar">
          <a href="#/" className="admin-back-link admin-top-bar-home">
            {c.adminHome}
          </a>
        </div>
        <p className="message">{c.loadingGame}</p>
      </main>
    )
  }

  return (
    <main className="app admin-console">
      <div className="admin-top-bar">
        <div className="admin-top-bar-left">
          <a href="#/" className="admin-back-link admin-top-bar-home">
            {c.adminHome}
          </a>
        </div>
        <button
          type="button"
          className={`secondary admin-settings-icon-btn${adminSettingsOpen ? ' admin-settings-toggle-active' : ''}`.trim()}
          aria-expanded={adminSettingsOpen}
          aria-controls="admin-settings-panel"
          aria-label={adminSettingsOpen ? c.adminCloseSettingsPanel : c.changeSettings}
          onClick={() => setAdminSettingsOpen((o) => !o)}
        >
          <AdminSettingsGearIcon />
        </button>
        <div className="admin-top-bar-right">
          <button type="button" className="secondary" onClick={onLogout}>
            {c.adminLogout}
          </button>
        </div>
      </div>

      <header>
        <h1>{c.adminTitle}</h1>
      </header>

      {adminSettingsOpen ? (
        <div id="admin-settings-panel" className="admin-settings-panel">
          <AdminChangePasswordForm />
        </div>
      ) : null}

      <div className="admin-main-section-tabs">
        <SegmentTabs
          ariaLabel={c.adminConsoleMainTabsLabel}
          value={adminSection}
          onChange={setAdminSection}
          options={[
            { value: 'suggestions', label: c.adminTabSuggestions },
            { value: 'import', label: c.adminTabImport },
            { value: 'dictionary', label: c.adminTabDictionary },
          ]}
        />
      </div>

      {adminSection === 'import' ? (
        <AdminImportWordsPanel locale={locale} />
      ) : adminSection === 'dictionary' ? (
        <AdminDictionaryWordsPanel locale={locale} />
      ) : (
        <>
          <div className="admin-suggestions-section">
            <SegmentTabs
              ariaLabel={c.adminSuggestionsTabsLabel}
              value={suggestionsLangTab}
              onChange={setSuggestionsLangTab}
              options={[
                { value: 'ru', label: c.langRu },
                { value: 'en', label: c.langEn },
              ]}
            />
          </div>
          {listErr ? <p className="message admin-list-error">{c.adminLoadError}</p> : null}
          {items.length === 0 ? (
            <p className="message">{c.adminEmptyList}</p>
          ) : filteredItems.length === 0 ? (
            <p className="message">{c.adminEmptyListForLang}</p>
          ) : (
            <ul className="admin-suggestion-list">
              {filteredItems.map((x) => {
                const k = rowKey(x)
                const busy = busyKey === k
                return (
                  <li key={k} className="admin-suggestion-row">
                    <div className="admin-suggestion-meta">
                      <span className="admin-suggestion-word">{displayWord(x.lang, x.word)}</span>
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
        </>
      )}
    </main>
  )
}
