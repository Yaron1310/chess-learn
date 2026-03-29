import { useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import GameBoard from './components/GameBoard'
import ScoringSidebar from './components/ScoringSidebar'
import SkillSelector from './components/SkillSelector'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish, cpLossToScore } from './hooks/useStockfish'
import './App.css'

export default function App() {
  const [skillLevel, setSkillLevel]   = useState(1)        // 0–4
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isThinking, setIsThinking]   = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [moveScore, setMoveScore]     = useState(null)
  const [lastMove, setLastMove]       = useState(null)
  const [gameStarted, setGameStarted] = useState(false)

  const {
    fen, isExploring, gameOver,
    getGame, makeMove,
    enterExplore, exitExplore, resetGame,
  } = useChessGame()

  const { evaluatePosition, getAIMove } = useStockfish()

  // Depth to use for evaluating the user's move quality
  // Use a constant moderate depth so scoring is consistent
  const EVAL_DEPTH = 14

  const handleUserMove = useCallback(async (moveInput) => {
    if (isThinking || gameOver) return false

    const game = getGame()

    // 1. Capture the FEN *before* the user's move (for best-move lookup)
    const fenBeforeMove = game.fen()

    // 2. Apply the move to get the resulting FEN
    const move = makeMove(moveInput)
    if (!move) return false   // illegal move

    setLastMove({ from: move.from, to: move.to })
    setGameStarted(true)
    setMoveScore(null)
    setIsAnalyzing(true)

    // 3. In parallel: evaluate best move from pre-move position
    //    and evaluate the position after user's move
    const fenAfterUserMove = getGame().fen()

    try {
      // Must be sequential — Stockfish uses a single callback slot.
      // Running both in parallel via Promise.all causes the second call to
      // overwrite the first's callback, leaving the first promise unresolved.
      const { bestMove, score: bestScore } = await evaluatePosition(fenBeforeMove, EVAL_DEPTH)
      const { score: userScore }           = await evaluatePosition(fenAfterUserMove, EVAL_DEPTH)

      // bestScore is from white's perspective (positive = white advantage)
      // After user (white) moves, userScore from white's perspective
      // cpLoss = bestScore - userScore (both from white's view)
      // A negative loss means the user did better than the engine expected (rare)
      const cpLoss = Math.max(0, bestScore - userScore)

      // Convert best move from UCI to SAN notation for display
      let bestMoveSan = null
      if (bestMove && bestMove !== move.from + move.to) {
        const evalGame = new Chess(fenBeforeMove)
        try {
          const bestMoveObj = evalGame.move({
            from: bestMove.slice(0, 2),
            to:   bestMove.slice(2, 4),
            promotion: bestMove[4] || undefined,
          })
          bestMoveSan = bestMoveObj?.san ?? bestMove
        } catch {
          bestMoveSan = bestMove
        }
      }

      const score = cpLossToScore(cpLoss)

      setMoveScore({
        moveSan: move.san,
        bestMoveSan,
        isBestMove: !bestMove || bestMove === (move.from + move.to),
        score,
        cpLoss,
      })
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }

    // 4. Check game over before AI responds
    if (getGame().isGameOver()) return true

    // 5. Ask AI for its response move
    setIsThinking(true)
    try {
      const currentFen = getGame().fen()
      const { bestMove: aiMove } = await getAIMove(currentFen, skillLevel)
      if (aiMove) {
        const aiMoveResult = makeMove({
          from: aiMove.slice(0, 2),
          to:   aiMove.slice(2, 4),
          promotion: aiMove[4] || 'q',
        })
        if (aiMoveResult) {
          setLastMove({ from: aiMoveResult.from, to: aiMoveResult.to })
        }
      }
    } catch (err) {
      console.error('AI move error:', err)
    } finally {
      setIsThinking(false)
    }

    return true
  }, [isThinking, gameOver, getGame, makeMove, evaluatePosition, getAIMove, skillLevel])

  const handleReset = useCallback(() => {
    resetGame()
    setMoveScore(null)
    setLastMove(null)
    setIsThinking(false)
    setIsAnalyzing(false)
    setGameStarted(false)
  }, [resetGame])

  const handleExplore = useCallback(() => {
    enterExplore()
    setSidebarOpen(true)
  }, [enterExplore])

  const handleReturn = useCallback(() => {
    exitExplore()
  }, [exitExplore])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">♟ Chess Learn</span>
        </div>
        <div className="header-center">
          <SkillSelector
            selected={skillLevel}
            onChange={setSkillLevel}
            disabled={gameStarted && !gameOver}
          />
        </div>
        <div className="header-right">
          <button className="new-game-btn" onClick={handleReset}>
            New Game
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="board-area">
          <div className="player-label opponent">
            Computer ({['Beginner','Casual','Intermediate','Advanced','Master'][skillLevel]})
          </div>

          <GameBoard
            fen={fen}
            onMove={handleUserMove}
            isThinking={isThinking}
            gameOver={gameOver}
            isExploring={isExploring}
            lastMove={lastMove}
          />

          <div className="player-label you">
            You (White)
          </div>
        </div>

        <ScoringSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          moveScore={moveScore}
          isAnalyzing={isAnalyzing}
          isExploring={isExploring}
          onExplore={handleExplore}
          onReturn={handleReturn}
        />
      </main>
    </div>
  )
}
