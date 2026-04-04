import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { afterWordSuggestedAtom } from '../atoms'
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
  const afterSuggested = useSetAtom(afterWordSuggestedAtom)

  if (!visible) return null

  const onSuggest = () => {
    if (busy) return
    setBusy(true)
    void suggestWord(locale, candidate)
      .then((r) => {
        afterSuggested(r.status === 'already_suggested' ? 'dup' : 'sent')
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'unknown'
        window.alert(c.suggestError(code))
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="suggest-word-action">
      <button type="button" className="secondary suggest-word-btn" disabled={busy} onClick={onSuggest}>
        {busy ? '…' : c.suggestWord}
      </button>
    </div>
  )
}
