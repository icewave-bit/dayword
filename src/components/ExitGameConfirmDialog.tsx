import { useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { exitGameConfirmOpenAtom, localeAtom, openSetupAtom } from '../atoms'
import { t } from '../lib/i18n'

export function ExitGameConfirmDialog() {
  const [open, setOpen] = useAtom(exitGameConfirmOpenAtom)
  const locale = useAtomValue(localeAtom)
  const openSetup = useSetAtom(openSetupAtom)
  const c = t(locale)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-game-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="exit-game-confirm-title" className="confirm-dialog-title">
          {c.exitGameConfirmTitle}
        </h2>
        <p className="confirm-dialog-hint">{c.exitGameConfirmHint}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="primary-action" onClick={() => setOpen(false)}>
            {c.exitGameConfirmStay}
          </button>
          <button type="button" className="secondary" onClick={() => openSetup()}>
            {c.exitGameConfirmLeave}
          </button>
        </div>
      </div>
    </div>
  )
}
