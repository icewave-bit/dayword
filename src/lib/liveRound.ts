/** Должно совпадать с сервером (UTC, миллисекунды с эпохи). */
export const LIVE_ROUND_MS = 3 * 60 * 60 * 1000

export type GameMode = 'live' | 'practice'

/** Время до смены слова в live: граница (liveRoundId + 1) * LIVE_ROUND_MS. */
export function msUntilLiveRoundResets(liveRoundId: number | null): number {
  const now = Date.now()
  const round =
    liveRoundId !== null && Number.isFinite(liveRoundId)
      ? liveRoundId
      : Math.floor(now / LIVE_ROUND_MS)
  return Math.max(0, (round + 1) * LIVE_ROUND_MS - now)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatLiveRoundCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}
