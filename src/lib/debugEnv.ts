import { getViteMergedEnv } from './runtimeEnv'

/** Логи проверки слова (клиент). В .env: VITE_DEBUG_CHECK=1 */
export function isWordCheckDebugEnabled(): boolean {
  const v = getViteMergedEnv('VITE_DEBUG_CHECK').toLowerCase()
  return v === '1' || v === 'true'
}
