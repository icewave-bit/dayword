import type { Locale } from '../lib/i18n'
import { t } from '../lib/i18n'
import type { LeaderboardTop3Item } from '../atoms'

export function MonthlyLeaderboardTop3({
  locale,
  loading,
  items,
}: {
  locale: Locale
  loading: boolean
  items: LeaderboardTop3Item[]
}) {
  const c = t(locale)

  return (
    <section className="setup-panel leaderboard-panel" aria-label={c.leaderboardMonthTitle}>
      <h2 className="leaderboard-title">{c.leaderboardMonthTitle}</h2>
      {loading ? (
        <p className="message">{c.leaderboardMonthLoading}</p>
      ) : items.length ? (
        <ol className="leaderboard-list">
          {items.map((it, idx) => (
            <li key={`${it.username}-${idx}`} className="leaderboard-row">
              <span className="leaderboard-rank">{idx + 1}.</span>
              <span className="leaderboard-username">{it.username}</span>
              <span className="leaderboard-points">{c.leaderboardMonthPts(it.points)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="message">{c.leaderboardMonthEmpty}</p>
      )}
    </section>
  )
}

