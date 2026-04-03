import { useEffect, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  loadDailyAndHydrateAtom,
  loadSettingsAtom,
  refreshUserMeAtom,
  sessionAtom,
  themeAtom,
} from './atoms'
import { AdminConsole } from './components/AdminConsole'
import { GameScreen } from './components/GameScreen'
import { SetupScreen } from './components/SetupScreen'
import { AuthHubScreen } from './components/AuthHubScreen'

function parseHashView(hash: string): 'admin' | 'login' | null {
  if (hash.startsWith('#/admin')) return 'admin'
  if (hash.startsWith('#/login')) return 'login'
  return null
}

function useHashView() {
  const [view, setView] = useState(() => parseHashView(window.location.hash))
  useEffect(() => {
    const onHash = () => setView(parseHashView(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return view
}

function App() {
  const session = useAtomValue(sessionAtom)
  const theme = useAtomValue(themeAtom)
  const loadSettings = useSetAtom(loadSettingsAtom)
  const loadGame = useSetAtom(loadDailyAndHydrateAtom)
  const refreshUser = useSetAtom(refreshUserMeAtom)
  const hashView = useHashView()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (session !== 'playing' || hashView) return
    void loadGame()
  }, [session, loadGame, hashView])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (hashView === 'admin') return <AdminConsole />
  if (hashView === 'login') return <AuthHubScreen />

  return session === 'setup' ? <SetupScreen /> : <GameScreen />
}

export default App
