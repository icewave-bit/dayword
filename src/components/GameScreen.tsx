import { useEffect, type CSSProperties } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  addLetterAtom,
  answerAtom,
  currentGuessAtom,
  gameLoadErrorAtom,
  gameLoadingAtom,
  gameModeAtom,
  keyboardRowsAtom,
  keyboardStateAtom,
  liveRoundIdAtom,
  loadDailyAndHydrateAtom,
  localeAtom,
  MAX_ATTEMPTS,
  messageAtom,
  exitGameConfirmOpenAtom,
  removeLetterAtom,
  resetGameAtom,
  resultsAtom,
  statusAtom,
  submitGuessAtom,
  syncLiveRoundScoreAtom,
  helpOpenAtom,
  userAuthAtom,
  wordLengthAtom,
} from '../atoms'
import { t } from '../lib/i18n'
import { SuggestWordAction } from './SuggestWordAction'
import { ExitGameConfirmDialog } from './ExitGameConfirmDialog'
import { LiveRoundCountdown } from './LiveRoundCountdown'

type CellState = 'correct' | 'present' | 'absent'

type TileProps = {
  value: string
  state?: CellState
  isActive?: boolean
  isInputFilled?: boolean
}

function Tile({ value, state, isActive = false, isInputFilled = false }: TileProps) {
  return (
    <div
      className={`tile ${state ?? ''} ${isActive ? 'active' : ''} ${isInputFilled ? 'input-filled' : ''}`.trim()}
      data-active={isActive ? 'true' : 'false'}
      aria-label={value || 'empty'}
    >
      {isActive ? <span className="tile-focus-ring" aria-hidden="true" /> : null}
      <span className="tile-value">{value}</span>
    </div>
  )
}

type BoardRow = {
  word: string
  states: Array<CellState | undefined>
}

export function GameScreen() {
  const gameMode = useAtomValue(gameModeAtom)
  const userAuth = useAtomValue(userAuthAtom)
  const locale = useAtomValue(localeAtom)
  const wordLength = useAtomValue(wordLengthAtom)
  const liveRoundId = useAtomValue(liveRoundIdAtom)
  const currentGuess = useAtomValue(currentGuessAtom)
  const message = useAtomValue(messageAtom)
  const status = useAtomValue(statusAtom)
  const keyboardState = useAtomValue(keyboardStateAtom)
  const answer = useAtomValue(answerAtom)
  const results = useAtomValue(resultsAtom)
  const keyboardRows = useAtomValue(keyboardRowsAtom)
  const loading = useAtomValue(gameLoadingAtom)
  const loadError = useAtomValue(gameLoadErrorAtom)
  const addLetter = useSetAtom(addLetterAtom)
  const removeLetter = useSetAtom(removeLetterAtom)
  const submitGuess = useSetAtom(submitGuessAtom)
  const resetGame = useSetAtom(resetGameAtom)
  const setExitConfirmOpen = useSetAtom(exitGameConfirmOpenAtom)
  const exitConfirmOpen = useAtomValue(exitGameConfirmOpenAtom)
  const reloadGame = useSetAtom(loadDailyAndHydrateAtom)
  const syncLiveScore = useSetAtom(syncLiveRoundScoreAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const c = t(locale)

  const inputLocked = loading || loadError !== null || !answer
  const gameInputBlocked = inputLocked || exitConfirmOpen

  useEffect(() => {
    if (gameMode !== 'live') return
    if (status !== 'won' && status !== 'lost') return
    void syncLiveScore()
  }, [gameMode, status, userAuth, syncLiveScore])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (exitConfirmOpen) return
      if (inputLocked) return
      if (event.key === 'Enter') {
        event.preventDefault()
        void submitGuess()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        removeLetter()
        return
      }

      if (locale === 'en') {
        if (/^[a-zA-Z]$/.test(event.key)) {
          addLetter(event.key.toUpperCase())
          return
        }
        if (/^Key[A-Z]$/.test(event.code)) {
          addLetter(event.code.slice(3))
        }
        return
      }

      if (event.key.length !== 1) return
      const ch = event.key.toUpperCase()
      if (ch === 'Ё' || /^[А-Я]$/.test(ch)) {
        addLetter(ch)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addLetter, removeLetter, submitGuess, locale, inputLocked, exitConfirmOpen])

  useEffect(() => {
    setHelpOpen(false)
  }, [setHelpOpen])

  const rows: BoardRow[] = Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
    if (rowIndex < results.length) {
      return results[rowIndex]
    }
    if (rowIndex === results.length) {
      return {
        word: currentGuess.padEnd(wordLength, ' '),
        states: Array.from({ length: wordLength }, () => undefined),
      }
    }
    return {
      word: ''.padEnd(wordLength, ' '),
      states: Array.from({ length: wordLength }, () => undefined),
    }
  })
  const len = wordLength
  const currentInputRowIndex = Math.min(results.length, MAX_ATTEMPTS - 1)
  const activeCellIndex = Math.min(currentGuess.length, len - 1)

  const statusMessage =
    message === 'short'
      ? c.enterWordLength(len)
      : message === 'notInDictionary'
        ? c.notInDictionary
        : message === 'alreadyUsed'
          ? c.alreadyUsed
          : message === 'suggestSent'
            ? c.suggestSent
            : message === 'suggestDup'
              ? c.suggestDuplicate
              : ''

  const hintMessage =
    loading || !answer
      ? ''
      : status === 'won'
        ? c.won(answer)
        : status === 'lost'
          ? c.lost(answer)
          : c.hintPlaying

  const bannerMessage = loadError
    ? `${c.loadFailed} (${loadError})`
    : loading
      ? c.loadingGame
      : ''

  return (
    <main className="app">
      <header className="app-header app-header-game">
        <div className="game-header-top-row">
          <h1 className="game-title">{c.title}</h1>
          <p className="mode-badge" data-mode={gameMode}>
            {gameMode === 'live' ? c.modeLiveBadge : c.modePracticeBadge}
          </p>
        </div>
        {gameMode === 'live' ? (
          <LiveRoundCountdown liveRoundId={liveRoundId} label={c.liveRoundCountdownLabel} />
        ) : null}
      </header>

      <section
        className="board"
        aria-label={c.boardAria}
        style={{ '--word-length': len } as CSSProperties}
      >
        {rows.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.word.split('').map((letter, index) => (
              <Tile
                key={`cell-${rowIndex}-${index}`}
                value={letter.trim()}
                state={row.states[index]}
                isActive={rowIndex === currentInputRowIndex && index === activeCellIndex}
                isInputFilled={rowIndex === currentInputRowIndex && index < currentGuess.length}
              />
            ))}
          </div>
        ))}
      </section>

      <p className="message" role="status">
        {bannerMessage || statusMessage || hintMessage}
      </p>

      <SuggestWordAction
        locale={locale}
        candidate={currentGuess}
        visible={
          !gameInputBlocked &&
          message === 'notInDictionary' &&
          currentGuess.length === wordLength
        }
      />

      {loadError ? (
        <button type="button" className="primary-action" onClick={() => void reloadGame()}>
          {c.retryLoad}
        </button>
      ) : null}

      <section
        className={[
          'keyboard',
          locale === 'ru' && 'keyboard-ru',
          locale === 'en' && 'keyboard-en',
          gameInputBlocked && 'keyboard-locked',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={c.keyboardAria}
        aria-disabled={gameInputBlocked}
      >
        {keyboardRows.map((row) => (
          <div className="keyboard-row" key={row}>
            {row.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                className={`key ${keyboardState[letter] ?? ''}`.trim()}
                disabled={gameInputBlocked}
                onClick={() => addLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className="keyboard-row keyboard-actions">
          <button
            type="button"
            className="key action"
            disabled={gameInputBlocked}
            onClick={() => removeLetter()}
          >
            {c.backspaceKey}
          </button>
          <button
            type="button"
            className="key action"
            disabled={gameInputBlocked}
            onClick={() => void submitGuess()}
          >
            {c.enterKey}
          </button>
        </div>
      </section>

      <div className="footer-actions">
        <button
          type="button"
          className="restart"
          onClick={() => {
            void resetGame()
          }}
          disabled={loading || exitConfirmOpen}
        >
          {gameMode === 'live' ? c.newGameLive : c.newGamePractice}
        </button>
        <button type="button" className="secondary" onClick={() => setExitConfirmOpen(true)}>
          {c.exitGameScreen}
        </button>
      </div>

      <ExitGameConfirmDialog />
    </main>
  )
}
