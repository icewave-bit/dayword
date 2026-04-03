import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ChoiceChips } from './ChoiceChips'
import {
  helpOpenAtom,
  localeAtom,
  settingsOpenAtom,
  themeAtom,
  wordLengthAtom,
} from '../atoms'
import { t, type Locale } from '../lib/i18n'
import { type ThemeMode } from '../atoms'
import type { WordLength } from '../lib/words'
import { useEffect } from 'react'

export function SettingsDisclosure() {
  const [open, setOpen] = useAtom(settingsOpenAtom)
  const locale = useAtomValue(localeAtom)
  const wordLength = useAtomValue(wordLengthAtom)
  const theme = useAtomValue(themeAtom)

  const setLocale = useSetAtom(localeAtom)
  const setWordLength = useSetAtom(wordLengthAtom)
  const setTheme = useSetAtom(themeAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)

  const c = t(locale)

  // Закрываем помощь при открытии настроек (чтобы не было двух открытых панелей).
  useEffect(() => {
    if (!open) return
    setHelpOpen(false)
  }, [open, setHelpOpen])

  return (
    <div className="settings-disclosure">
      <button
        type="button"
        className="settings-button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="settings-panel"
      >
        {c.changeSettings}
      </button>

      <div
        id="settings-panel"
        className="settings-spoiler"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
      >
        <section className="setup-panel" aria-label={c.changeSettings}>
          <ChoiceChips<Locale>
            label={c.languageLabel}
            value={locale}
            onChange={setLocale}
            options={[
              { value: 'ru', label: c.langRu },
              { value: 'en', label: c.langEn },
            ]}
          />

          <ChoiceChips<WordLength>
            label={c.lettersLabel}
            value={wordLength}
            onChange={setWordLength}
            options={[
              { value: 4, label: c.lettersN(4) },
              { value: 5, label: c.lettersN(5) },
              { value: 6, label: c.lettersN(6) },
            ]}
          />

          <ChoiceChips<ThemeMode>
            label={c.themeLabel}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: c.themeDark },
              { value: 'light', label: c.themeLight },
            ]}
          />
        </section>
      </div>
    </div>
  )
}

