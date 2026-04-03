import { useEffect, useState } from 'react'
import { suggestWord } from '../lib/api'
import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'

type Props = {
  locale: Locale
  /** Уже нормализованное слово той же длины, что поле. */
  candidate: string
  visible: boolean
}

export function SuggestWordAction({ locale, candidate, visible }: Props) {
  const c = t(locale)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<'sent' | 'dup' | null>(null)

  useEffect(() => {
    if (!visible) {
      setNote(null)
      setBusy(false)
    }
  }, [visible])

  if (!visible) return null

  const onSuggest = () => {
    if (busy) return
    setBusy(true)
    setNote(null)
    void suggestWord(locale, candidate)
      .then((r) => {
        if (r.status === 'already_suggested') setNote('dup')
        else setNote('sent')
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'unknown'
        setNote(null)
        window.alert(c.suggestError(code))
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="suggest-word-action">
      <button type="button" className="secondary suggest-word-btn" disabled={busy} onClick={onSuggest}>
        {busy ? '…' : c.suggestWord}
      </button>
      {note === 'sent' ? <p className="suggest-word-note">{c.suggestSent}</p> : null}
      {note === 'dup' ? <p className="suggest-word-note">{c.suggestDuplicate}</p> : null}
    </div>
  )
}
