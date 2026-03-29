import { useState, useCallback, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import GameBoard from './components/GameBoard'
import ScoringSidebar from './components/ScoringSidebar'
import GameSetupModal from './components/GameSetupModal'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish, cpLossToScore } from './hooks/useStockfish'
import './App.css'

const EVAL_DEPTH = 14

export default function App() {
  const [skillLevel, setSkillLevel]   = useState(1)
  // Start collapsed on mobile so the board isn't pushed off screen
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 700)
  const [isThinking, setIsThinking]   = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [moveScore, setMoveScore]     = useState(null)
  const [lastMove, setLastMove]       = useState(null)
  const [playerColor, setPlayerColor] = useState(null)
  const [showSetup, setShowSetup]     = useState(true)

  const [selectedSquare, setSelectedSquare] = useState(null)
  const [optionSquares, setOptionSquares]   = useState({})

  const aiFirstMoveFiredRef = useRef(false)

  const {
    fen, isExploring, gameOver,
    getGame, makeMove, undoMove,
    enterExplore, exitExplore, resetGame,
  } = useChessGame()

  const { evaluatePosition, getAIMove } = useStockfish()

  // ── Helpers ───────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setOptionSquares({})
  }, [])

  const getOptionSquares = useCallback((square) => {
    const game = getGame()
    const moves = game.moves({ square, verbose: true })
    if (!moves.length) return {}
    const squares = {}
    moves.forEach(({ to }) => {
      const targetPiece = game.get(to)
      squares[to] = targetPiece
        ? { background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.25) 60%)', borderRadius: '50%' }
        : { background: 'radial-gradient(circle, rgba(0,0,0,0.22) 28%, transparent 28%)', borderRadius: '50%' }
    })
    return squares
  }, [getGame])

  // ── AI move ───────────────────────────────────────────────────────────────

  const triggerAIMove = useCallback(async (currentFen) => {
    setIsThinking(true)
    try {
      const { bestMove: aiMove } = await getAIMove(currentFen, skillLevel)
      if (aiMove) {
        const result = makeMove({
          from: aiMove.slice(0, 2),
          to:   aiMove.slice(2, 4),
          promotion: aiMove[4] || 'q',
        })
        if (result) setLastMove({ from: result.from, to: result.to })
      }
    } catch (err) {
      console.error('AI move error:', err)
    } finally {
      setIsThinking(false)
    }
  }, [getAIMove, skillLevel, makeMove])

  useEffect(() => {
    if (playerColor === 'black' && !showSetup && !aiFirstMoveFiredRef.current) {
      aiFirstMoveFiredRef.current = true
      triggerAIMove(getGame().fen())
    }
  }, [playerColor, showSetup]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User move ─────────────────────────────────────────────────────────────

  const handleUserMove = useCallback(async (moveInput) => {
    if (isThinking || gameOver) return false

    const game = getGame()
    const fenBeforeMove = game.fen()
    const move = makeMove(moveInput)
    if (!move) return false

    clearSelection()
    setLastMove({ from: move.from, to: move.to })
    setMoveScore(null)
    setIsAnalyzing(true)

    const fenAfterUserMove = getGame().fen()

    try {
      const { bestMove, score: bestScore } = await evaluatePosition(fenBeforeMove, EVAL_DEPTH)
      const { score: userScore }           = await evaluatePosition(fenAfterUserMove, EVAL_DEPTH)

      const cpLoss = Math.max(0, bestScore - userScore)

      let bestMoveSan = null
      if (bestMove && bestMove !== move.from + move.to && cpLoss > 0) {
        try {
          const evalGame = new Chess(fenBeforeMove)
          const obj = evalGame.move({
            from: bestMove.slice(0, 2),
            to:   bestMove.slice(2, 4),
            promotion: bestMove[4] || undefined,
          })
          bestMoveSan = obj?.san ?? bestMove
        } catch {
          bestMoveSan = bestMove
        }
      }

      setMoveScore({
        moveSan:     move.san,
        bestMoveSan: cpLoss > 0 ? bestMoveSan : null,
        isBestMove:  cpLoss === 0,
        score:       cpLossToScore(cpLoss),
        cpLoss,
      })
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }

    if (getGame().isGameOver()) return true
    await triggerAIMove(getGame().fen())
    return true
  }, [isThinking, gameOver, getGame, makeMove, evaluatePosition, triggerAIMove, clearSelection])

  // ── Click-to-move ─────────────────────────────────────────────────────────

  const handleSquareClick = useCallback((square) => {
    if (isThinking || gameOver) return

    const game   = getGame()
    const piece  = game.get(square)
    const myChar = playerColor === 'white' ? 'w' : 'b'

    if (selectedSquare) {
      const isLegal = game.moves({ square: selectedSquare, verbose: true }).some(m => m.to === square)
      if (isLegal) {
        handleUserMove({ from: selectedSquare, to: square, promotion: 'q' })
        return
      }
    }

    if (piece && piece.color === myChar) {
      setSelectedSquare(square)
      setOptionSquares(getOptionSquares(square))
    } else {
      clearSelection()
    }
  }, [isThinking, gameOver, getGame, playerColor, selectedSquare, handleUserMove, getOptionSquares, clearSelection])

  // ── Undo ──────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (isThinking || isAnalyzing) return
    const steps = isExploring ? 1 : 2
    if (undoMove(steps)) {
      clearSelection()
      setMoveScore(null)
      setLastMove(null)
    }
  }, [isThinking, isAnalyzing, isExploring, undoMove, clearSelection])

  // ── Setup / New game ──────────────────────────────────────────────────────

  const handleColorSelect = useCallback((color, skill) => {
    aiFirstMoveFiredRef.current = false
    resetGame()
    clearSelection()
    setSkillLevel(skill)
    setMoveScore(null)
    setLastMove(null)
    setIsThinking(false)
    setIsAnalyzing(false)
    setPlayerColor(color)
    setShowSetup(false)
  }, [resetGame, clearSelection])

  // ── Render ────────────────────────────────────────────────────────────────

  const gameStarted    = !showSetup
  const difficultyName = ['Beginner','Casual','Intermediate','Advanced','Master'][skillLevel]
  const opponentLabel  = `Computer (${difficultyName})`

  return (
    <div className="app">
      {showSetup && (
        <GameSetupModal skillLevel={skillLevel} onSelect={handleColorSelect} />
      )}

      <header className="app-header">
        <span className="logo">♟ Chess Learn</span>
        <div className="header-right">
          <button
            className="undo-btn"
            onClick={handleUndo}
            disabled={!gameStarted || isThinking || isAnalyzing}
            title="Undo last move"
          >
            ↩ Undo
          </button>
          <button className="new-game-btn" onClick={() => setShowSetup(true)}>
            New Game
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="board-area">
          <div className="player-label opponent">
            {playerColor === 'black' ? 'You (Black)' : opponentLabel}
          </div>

          <GameBoard
            fen={fen}
            onMove={handleUserMove}
            onSquareClick={handleSquareClick}
            isThinking={isThinking}
            gameOver={gameOver}
            isExploring={isExploring}
            lastMove={lastMove}
            selectedSquare={selectedSquare}
            optionSquares={optionSquares}
            playerColor={playerColor || 'white'}
            boardOrientation={playerColor === 'black' ? 'black' : 'white'}
          />

          <div className="player-label you">
            {playerColor === 'black' ? opponentLabel : 'You (White)'}
          </div>
        </div>

        <ScoringSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          moveScore={moveScore}
          isAnalyzing={isAnalyzing}
          isExploring={isExploring}
          onExplore={() => { enterExplore(); setSidebarOpen(true) }}
          onReturn={exitExplore}
        />
      </main>
    </div>
  )
}
