import { useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  localeAtom,
  leaderboardMonthTop3Atom,
  leaderboardMonthTop3LoadingAtom,
  persistSettingsAtom,
  sessionAtom,
  startLiveGameAtom,
  startPracticeGameAtom,
  refreshLeaderboardMonthTop3Atom,
  themeAtom,
  helpOpenAtom,
  wordLengthAtom,
} from '../atoms'
import { t } from '../lib/i18n'
import { UserAuthBar } from './UserAuthBar'
import { MonthlyLeaderboardTop3 } from './MonthlyLeaderboardTop3'
import { HelpDisclosure } from './HelpDisclosure'
import { SettingsDisclosure } from './SettingsDisclosure'

export function SetupScreen() {
  const locale = useAtomValue(localeAtom)
  const wordLength = useAtomValue(wordLengthAtom)
  const theme = useAtomValue(themeAtom)
  const session = useAtomValue(sessionAtom)
  const persist = useSetAtom(persistSettingsAtom)
  const startLive = useSetAtom(startLiveGameAtom)
  const startPractice = useSetAtom(startPracticeGameAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const c = t(locale)
  const leaderboardTop3 = useAtomValue(leaderboardMonthTop3Atom)
  const leaderboardLoading = useAtomValue(leaderboardMonthTop3LoadingAtom)
  const refreshLeaderboardTop3 = useSetAtom(refreshLeaderboardMonthTop3Atom)

  useEffect(() => {
    if (session === 'setup') persist()
  }, [session, locale, wordLength, theme, persist])

  useEffect(() => {
    void refreshLeaderboardTop3()
  }, [refreshLeaderboardTop3])

  useEffect(() => {
    setHelpOpen(false)
  }, [setHelpOpen])

  return (
    <main className="app setup">
      <header className="app-header">
        <div className="app-header-corner">
          <UserAuthBar />
        </div>
        <h1 className="game-title">{c.title}</h1>
      </header>

      <div className="setup-actions">
        <button type="button" className="primary-action" onClick={() => startLive()}>
          {c.playLive}
        </button>
        <button type="button" className="secondary-action" onClick={() => startPractice()}>
          {c.playPractice}
        </button>
      </div>

      <MonthlyLeaderboardTop3
        locale={locale}
        loading={leaderboardLoading}
        items={leaderboardTop3}
      />

      <SettingsDisclosure />

      <HelpDisclosure content={c.subtitle(wordLength)} />
    </main>
  )
}
