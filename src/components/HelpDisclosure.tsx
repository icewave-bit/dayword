import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { helpOpenAtom, localeAtom, settingsOpenAtom } from '../atoms'
import { t } from '../lib/i18n'

type HelpDisclosureProps = {
  content: string
}

export function HelpDisclosure({ content }: HelpDisclosureProps) {
  const [open, setOpen] = useAtom(helpOpenAtom)
  const locale = useAtomValue(localeAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const c = t(locale)

  return (
    <div className="help-disclosure">
      <button
        type="button"
        className="help-button"
        onClick={() =>
          setOpen((v) => {
            const next = !v
            if (next) setSettingsOpen(false)
            return next
          })
        }
        aria-expanded={open}
        aria-controls="help-panel"
      >
        {c.helpButton}
      </button>
      {open ? (
        <div id="help-panel" className="help-panel" role="note" aria-live="polite">
          {content}
        </div>
      ) : null}
    </div>
  )
}

