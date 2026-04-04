import { useState, type FormEvent } from 'react'
import { useAtomValue } from 'jotai'
import { adminChangePassword } from '../lib/api'
import { localeAtom } from '../atoms'
import { t } from '../lib/i18n'

export function AdminChangePasswordForm() {
  const locale = useAtomValue(localeAtom)
  const c = t(locale)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorKey(null)
    setSuccess(false)
    setBusy(true)
    void adminChangePassword({
      currentPassword,
      newPassword,
      newPasswordConfirm,
    })
      .then(() => {
        setCurrentPassword('')
        setNewPassword('')
        setNewPasswordConfirm('')
        setSuccess(true)
      })
      .catch((err) => {
        const code = err instanceof Error ? err.message : 'change_password_failed'
        setErrorKey(code)
      })
      .finally(() => setBusy(false))
  }

  const errorText =
    errorKey === 'wrong_current_password'
      ? c.adminWrongCurrentPassword
      : errorKey === 'password_mismatch'
        ? c.adminPasswordMismatch
        : errorKey === 'bad_password'
          ? c.adminBadNewPassword
          : errorKey
            ? c.adminPasswordChangeGenericError
            : null

  return (
    <section className="admin-password-section">
      <h2 className="admin-subsection-title">{c.adminChangePasswordTitle}</h2>
      <form className="admin-login-form admin-password-change-form" onSubmit={onSubmit} autoComplete="off">
        <label className="field">
          <span>{c.adminCurrentPassword}</span>
          <input
            type="password"
            name="dayword-admin-current-pass"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{c.adminNewPassword}</span>
          <input
            type="password"
            name="dayword-admin-new-pass"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{c.adminPasswordAgain}</span>
          <input
            type="password"
            name="dayword-admin-new-pass2"
            autoComplete="new-password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
          />
        </label>
        {errorText ? <p className="admin-form-error">{errorText}</p> : null}
        {success ? <p className="admin-password-success">{c.adminPasswordChangeSuccess}</p> : null}
        <button type="submit" className="secondary" disabled={busy}>
          {busy ? '…' : c.adminChangePasswordSubmit}
        </button>
      </form>
    </section>
  )
}
