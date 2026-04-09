import { useId, useState, type ChangeEvent } from 'react'
import { useAtom } from 'jotai'
import { adminImportTargetLangAtom } from '../atoms'
import { adminImportWords, type AdminImportWordsResult } from '../lib/api'
import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'
import { SegmentTabs } from './SegmentTabs'

type Props = {
  locale: Locale
}

function formatSourceLabel(locale: Locale, src: string): string {
  const c = t(locale)
  if (src === 'dictionary') return c.adminImportSourceDictionary
  if (src === 'suggested') return c.adminImportSourceSuggested
  if (src === 'dismissed') return c.adminImportSourceDismissed
  return c.adminImportSourceUnknown
}

function formatReasonLabel(locale: Locale, reason: string): string {
  const c = t(locale)
  switch (reason) {
    case 'empty':
      return c.adminImportReasonEmpty
    case 'bad_length':
      return c.adminImportReasonBadLength
    case 'bad_line':
      return c.adminImportReasonBadLine
    case 'insert_failed':
      return c.adminImportReasonInsertFailed
    default:
      return reason
  }
}

export function AdminImportWordsPanel({ locale }: Props) {
  const c = t(locale)
  const [importLang, setImportLang] = useAtom(adminImportTargetLangAtom)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AdminImportWordsResult | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const textAreaId = useId()
  const fileInputId = useId()

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(typeof reader.result === 'string' ? reader.result : '')
      setClientError(null)
    }
    reader.onerror = () => setClientError(c.adminImportGenericError)
    reader.readAsText(f, 'UTF-8')
    e.target.value = ''
  }

  const onSubmit = () => {
    setClientError(null)
    setBusy(true)
    setResult(null)
    void adminImportWords({ lang: importLang, text })
      .then((r) => {
        if (r.ok === false) {
          if (r.error === 'too_many_lines' && typeof r.maxLines === 'number') {
            setClientError(c.adminImportTooManyLines(r.maxLines))
          } else {
            setClientError(c.adminImportGenericError)
          }
          return
        }
        setResult(r)
      })
      .catch(() => setClientError(c.adminImportGenericError))
      .finally(() => setBusy(false))
  }

  const showResult = result && result.ok === true

  return (
    <div className="admin-import-panel">
      <p className="admin-import-hint message">{c.adminImportHint}</p>

      <div className="admin-import-lang-row">
        <span className="admin-import-label" id={`${textAreaId}-lang-label`}>
          {c.adminImportLangLabel}
        </span>
        <SegmentTabs
          ariaLabel={c.adminImportLangLabel}
          value={importLang}
          onChange={setImportLang}
          options={[
            { value: 'ru', label: c.langRu },
            { value: 'en', label: c.langEn },
          ]}
        />
      </div>

      <div className="admin-import-field">
        <label className="admin-import-label" htmlFor={textAreaId}>
          {c.adminImportTextLabel}
        </label>
        <textarea
          id={textAreaId}
          className="admin-import-textarea"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={c.adminImportPlaceholder}
          disabled={busy}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <div className="admin-import-file-row">
        <input
          id={fileInputId}
          type="file"
          accept=".txt,text/plain,.csv"
          className="admin-import-file-input"
          onChange={onFileChange}
          disabled={busy}
        />
        <label htmlFor={fileInputId} className="secondary admin-import-file-label">
          {c.adminImportFileButton}
        </label>
        <span className="admin-import-file-hint">{c.adminImportFileHint}</span>
      </div>

      {clientError ? <p className="message admin-list-error">{clientError}</p> : null}

      <button type="button" className="primary-action" disabled={busy} onClick={onSubmit}>
        {busy ? c.adminImportSubmitting : c.adminImportSubmit}
      </button>

      <section className="admin-import-result" aria-label={c.adminImportResultTitle}>
        <h2 className="admin-subsection-title">{c.adminImportResultTitle}</h2>
        {!showResult ? (
          <p className="message">{c.adminImportNoReportYet}</p>
        ) : (
          <div className="admin-import-result-grid">
            <div className="admin-import-result-block">
              <h3 className="admin-import-result-heading">{c.adminImportAddedTitle(result.counts.added)}</h3>
              {result.counts.added === 0 ? (
                <p className="admin-import-result-empty">—</p>
              ) : (
                <ul className="admin-import-word-list">
                  {result.added.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-import-result-block">
              <h3 className="admin-import-result-heading">
                {c.adminImportAlreadyTitle(result.counts.alreadyInDatabase)}
              </h3>
              {result.counts.alreadyInDatabase === 0 ? (
                <p className="admin-import-result-empty">—</p>
              ) : (
                <ul className="admin-import-word-list">
                  {result.alreadyInDatabase.map((item, i) => (
                    <li key={`${i}-${item.word}-${item.source}`}>
                      {item.word}
                      <span className="admin-import-meta">
                        {' '}
                        — {formatSourceLabel(locale, item.source)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-import-result-block">
              <h3 className="admin-import-result-heading">{c.adminImportInvalidTitle(result.counts.invalid)}</h3>
              {result.counts.invalid === 0 ? (
                <p className="admin-import-result-empty">—</p>
              ) : (
                <ul className="admin-import-word-list">
                  {result.invalid.map((item, i) => (
                    <li key={`${i}:${item.raw}:${item.reason}`}>
                      <code className="admin-import-raw">{item.raw}</code>
                      <span className="admin-import-meta">
                        {' '}
                        — {formatReasonLabel(locale, item.reason)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
