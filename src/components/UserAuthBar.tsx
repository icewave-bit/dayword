import { useAtomValue, useSetAtom } from 'jotai'
import { localeAtom, logoutUserAtom, userAuthAtom } from '../atoms'
import { t } from '../lib/i18n'

export function UserAuthBar() {
  const locale = useAtomValue(localeAtom)
  const auth = useAtomValue(userAuthAtom)
  const logout = useSetAtom(logoutUserAtom)
  const c = t(locale)

  if (auth.status === 'unknown') return null

  if (auth.status === 'authed') {
    return (
      <div className="user-auth-bar user-auth-bar-authed">
        <span className="user-auth-bar-name">
          {auth.username}
          <span className="user-auth-bar-score"> {c.userLiveScoreTotal(auth.totalLiveScore)}</span>
        </span>
        <button type="button" className="user-auth-bar-logout" onClick={() => void logout()}>
          {c.userLogout}
        </button>
      </div>
    )
  }

  return (
    <div className="user-auth-bar">
      <a className="header-auth-entry" href="#/login">
        {c.userAccountLink}
      </a>
    </div>
  )
}
