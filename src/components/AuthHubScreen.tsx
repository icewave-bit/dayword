import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminRegister,
  type AdminMeState,
  userLogin,
  userRegister,
} from '../lib/api'
import { localeAtom, refreshUserMeAtom, userAuthAtom } from '../atoms'
import { t } from '../lib/i18n'

type UserTab = 'login' | 'register'

export function AuthHubScreen() {
  const locale = useAtomValue(localeAtom)
  const auth = useAtomValue(userAuthAtom)
  const refreshUser = useSetAtom(refreshUserMeAtom)
  const c = t(locale)

  const [userTab, setUserTab] = useState<UserTab>('login')

  const [userName, setUserName] = useState('')
  const [userPass, setUserPass] = useState('')
  const [userPass2, setUserPass2] = useState('')
  const [unifiedLoginErr, setUnifiedLoginErr] = useState(false)
  const [userRegErr, setUserRegErr] = useState<string | null>(null)
  const [userBusy, setUserBusy] = useState(false)

  const [adminMeState, setAdminMeState] = useState<AdminMeState | null>(null)
  const [adminBootErr, setAdminBootErr] = useState(false)
  const [regUser, setRegUser] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [regErr, setRegErr] = useState<string | null>(null)
  const [regBusy, setRegBusy] = useState(false)

  useEffect(() => {
    const full = window.location.hash
    if (full.startsWith('#/login/admin')) {
      window.history.replaceState(null, '', `#/login${full.slice('#/login/admin'.length)}`)
    }
  }, [])

  const refreshAdminMe = useCallback(() => {
    setAdminBootErr(false)
    return adminMe()
      .then(setAdminMeState)
      .catch(() => {
        setAdminBootErr(true)
        setAdminMeState(null)
      })
  }, [])

  useEffect(() => {
    void refreshAdminMe()
  }, [refreshAdminMe])

  const goGame = () => {
    window.location.hash = ''
  }

  const goAdminPanel = () => {
    window.location.hash = '#/admin'
  }

  const onUnifiedLogin = (e: FormEvent) => {
    e.preventDefault()
    setUnifiedLoginErr(false)
    setUserBusy(true)
    void (async () => {
      try {
        await adminLogin(userName, userPass)
        setUserPass('')
        goAdminPanel()
      } catch (err) {
        if (!(err instanceof Error)) {
          setUnifiedLoginErr(true)
          return
        }
        if (err.message === 'registration_required') {
          void refreshAdminMe()
          return
        }
        if (err.message === 'encryption_not_configured') {
          window.alert(c.adminEncryptionMissing)
          return
        }
        if (err.message === 'admin_not_configured') {
          window.alert(c.adminNotConfigured)
          return
        }
        if (err.message !== 'invalid_credentials') {
          setUnifiedLoginErr(true)
          return
        }
        try {
          await userLogin(userName, userPass)
          await refreshUser()
          setUserPass('')
          goGame()
        } catch {
          setUnifiedLoginErr(true)
        }
      } finally {
        setUserBusy(false)
      }
    })()
  }

  const onUserRegister = (e: FormEvent) => {
    e.preventDefault()
    setUserRegErr(null)
    setUserBusy(true)
    void userRegister({ username: userName, password: userPass, passwordConfirm: userPass2 })
      .then(async () => {
        await refreshUser()
        setUserPass('')
        setUserPass2('')
        goGame()
      })
      .catch((err) => {
        if (!(err instanceof Error)) {
          setUserRegErr('generic')
          return
        }
        if (err.message === 'username_taken') setUserRegErr('taken')
        else if (err.message === 'password_mismatch') setUserRegErr('mismatch')
        else if (err.message === 'bad_username') setUserRegErr('username')
        else if (err.message === 'bad_password') setUserRegErr('password')
        else setUserRegErr('generic')
      })
      .finally(() => setUserBusy(false))
  }

  const onAdminRegister = (e: FormEvent) => {
    e.preventDefault()
    setRegErr(null)
    setRegBusy(true)
    void adminRegister({
      username: regUser,
      password: regPass,
      passwordConfirm: regPass2,
    })
      .then(() => {
        goAdminPanel()
      })
      .catch((err) => {
        if (err instanceof Error) {
          if (err.message === 'password_mismatch') setRegErr('mismatch')
          else if (err.message === 'already_registered') setRegErr('already')
          else if (err.message === 'encryption_not_configured') {
            window.alert(c.adminEncryptionMissing)
          } else setRegErr('generic')
        } else setRegErr('generic')
      })
      .finally(() => setRegBusy(false))
  }

  const onAdminLogoutHub = () => {
    void adminLogout().then(() => void refreshAdminMe())
  }

  return (
    <main className="app admin-console user-auth-screen auth-hub">
      <header>
        <h1>{c.authHubTitle}</h1>
        <p>
          <a href="#/" className="admin-back-link">
            {c.adminBackToGame}
          </a>
        </p>
      </header>

      {adminMeState === null ? (
        adminBootErr ? (
          <div className="setup-panel admin-login-form">
            <p className="message">{c.adminLoadError}</p>
            <button type="button" className="primary-action" onClick={() => void refreshAdminMe()}>
              {c.retryLoad}
            </button>
          </div>
        ) : (
          <p className="message">{c.loadingGame}</p>
        )
      ) : !adminMeState.encryptionConfigured ? (
        <p className="message admin-encryption-msg">{c.adminEncryptionMissing}</p>
      ) : adminMeState.needsFirstSetup ? (
        <form
          className="setup-panel admin-login-form"
          onSubmit={onAdminRegister}
          autoComplete="off"
        >
          <h2 className="auth-hub-subtitle">{c.adminFirstRunTitle}</h2>
          <p className="admin-first-run-hint">{c.adminFirstRunHint}</p>
          <label className="field">
            <span>{c.adminLoginUser}</span>
            <input
              type="text"
              name="dayword-admin-new-user"
              autoComplete="off"
              value={regUser}
              onChange={(e) => setRegUser(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{c.adminLoginPass}</span>
            <input
              type="password"
              name="dayword-admin-new-pass"
              autoComplete="new-password"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{c.adminPasswordAgain}</span>
            <input
              type="password"
              name="dayword-admin-new-pass2"
              autoComplete="new-password"
              value={regPass2}
              onChange={(e) => setRegPass2(e.target.value)}
            />
          </label>
          {regErr === 'mismatch' ? (
            <p className="admin-form-error">{c.adminPasswordMismatch}</p>
          ) : null}
          {regErr === 'already' ? (
            <p className="admin-form-error">{c.adminAlreadyRegistered}</p>
          ) : null}
          {regErr === 'generic' ? (
            <p className="admin-form-error">{c.adminLoadError}</p>
          ) : null}
          <button type="submit" className="primary-action" disabled={regBusy}>
            {regBusy ? '…' : c.adminRegisterSubmit}
          </button>
        </form>
      ) : (
        <>
          {auth.status === 'authed' ? (
            <section className="setup-panel user-auth-authed-card">
              <p className="message">{c.userWelcomeAuthed}</p>
              <p className="user-auth-authed-name">{c.userLoggedInAs(auth.username)}</p>
              <button type="button" className="primary-action" onClick={goGame}>
                {c.userContinueToGame}
              </button>
            </section>
          ) : null}

          {adminMeState.authed ? (
            <section className="setup-panel user-auth-authed-card">
              <p className="message">{c.adminSessionActiveHub}</p>
              <button type="button" className="primary-action" onClick={goAdminPanel}>
                {c.adminGotoPanel}
              </button>
              <button type="button" className="secondary" onClick={() => void onAdminLogoutHub()}>
                {c.adminLogout}
              </button>
            </section>
          ) : null}

          {auth.status !== 'authed' ? (
            <>
              <div className="user-auth-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={userTab === 'login'}
                  className={`user-auth-tab ${userTab === 'login' ? 'active' : ''}`.trim()}
                  onClick={() => {
                    setUserTab('login')
                    setUnifiedLoginErr(false)
                    setUserRegErr(null)
                  }}
                >
                  {c.userLoginTab}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={userTab === 'register'}
                  className={`user-auth-tab ${userTab === 'register' ? 'active' : ''}`.trim()}
                  onClick={() => {
                    setUserTab('register')
                    setUnifiedLoginErr(false)
                    setUserRegErr(null)
                  }}
                >
                  {c.userRegisterTab}
                </button>
              </div>

              {userTab === 'login' ? (
                <form className="setup-panel admin-login-form" onSubmit={onUnifiedLogin}>
                  <p className="admin-first-run-hint">{c.authUnifiedSignInHint}</p>
                  <label className="field">
                    <span>{c.userNickname}</span>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{c.userPassword}</span>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={userPass}
                      onChange={(e) => setUserPass(e.target.value)}
                    />
                  </label>
                  {unifiedLoginErr ? (
                    <p className="admin-form-error">{c.userLoginError}</p>
                  ) : null}
                  <button type="submit" className="primary-action" disabled={userBusy}>
                    {userBusy ? '…' : c.userLoginSubmit}
                  </button>
                  <p className="user-auth-switch">
                    <button type="button" className="link-button" onClick={() => setUserTab('register')}>
                      {c.userSwitchToRegister}
                    </button>
                  </p>
                </form>
              ) : (
                <form className="setup-panel admin-login-form" onSubmit={onUserRegister}>
                  <p className="admin-first-run-hint">{c.userUsernameRules}</p>
                  <label className="field">
                    <span>{c.userNickname}</span>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{c.userPassword}</span>
                    <input
                      type="password"
                      name="new-password"
                      autoComplete="new-password"
                      value={userPass}
                      onChange={(e) => setUserPass(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{c.userPasswordAgain}</span>
                    <input
                      type="password"
                      name="new-password-confirm"
                      autoComplete="new-password"
                      value={userPass2}
                      onChange={(e) => setUserPass2(e.target.value)}
                    />
                  </label>
                  {userRegErr === 'mismatch' ? (
                    <p className="admin-form-error">{c.userPasswordMismatch}</p>
                  ) : null}
                  {userRegErr === 'taken' ? (
                    <p className="admin-form-error">{c.userUsernameTaken}</p>
                  ) : null}
                  {userRegErr === 'username' ? (
                    <p className="admin-form-error">{c.userBadUsername}</p>
                  ) : null}
                  {userRegErr === 'password' ? (
                    <p className="admin-form-error">{c.userBadPassword}</p>
                  ) : null}
                  {userRegErr === 'generic' ? (
                    <p className="admin-form-error">{c.userRegisterError}</p>
                  ) : null}
                  <button type="submit" className="primary-action" disabled={userBusy}>
                    {userBusy ? '…' : c.userRegisterSubmit}
                  </button>
                  <p className="user-auth-switch">
                    <button type="button" className="link-button" onClick={() => setUserTab('login')}>
                      {c.userSwitchToLogin}
                    </button>
                  </p>
                </form>
              )}
            </>
          ) : null}
        </>
      )}
    </main>
  )
}
