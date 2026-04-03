import { useEffect, useState } from 'react'
import { formatLiveRoundCountdown, msUntilLiveRoundResets } from '../lib/liveRound'

type Props = {
  liveRoundId: number | null
  label: string
}

export function LiveRoundCountdown({ liveRoundId, label }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => msUntilLiveRoundResets(liveRoundId))
  useEffect(() => {
    const tick = () => setRemainingMs(msUntilLiveRoundResets(liveRoundId))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [liveRoundId])

  const ms = remainingMs
  return (
    <p className="live-round-countdown" role="timer" aria-live="polite" aria-atomic="true">
      <span className="live-round-countdown-label">{label}</span>{' '}
      <span className="live-round-countdown-value">{formatLiveRoundCountdown(ms)}</span>
    </p>
  )
}
