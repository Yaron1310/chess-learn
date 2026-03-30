import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Chess } from 'chess.js'
import GameBoard from './components/GameBoard'
import ScoringSidebar from './components/ScoringSidebar'
import GameSetupModal from './components/GameSetupModal'
import CapturedPieces from './components/CapturedPieces'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish, cpLossToScore } from './hooks/useStockfish'
import './App.css'

const EVAL_DEPTH = 14

export default function App() {
  const [skillLevel, setSkillLevel]   = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 700)
  const [isThinking, setIsThinking]   = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [moveScore, setMoveScore]     = useState(null)
  const [lastMove, setLastMove]       = useState(null)
  const [playerColor, setPlayerColor] = useState(null)
  const [showSetup, setShowSetup]     = useState(true)
  const [showBestMove, setShowBestMove] = useState(false)

  const [selectedSquare, setSelectedSquare] = useState(null)
  const [optionSquares, setOptionSquares]   = useState({})

  const aiFirstMoveFiredRef = useRef(false)

  const {
    fen, isExploring, gameOver, moveHistory,
    getGame, makeMove, undoMove,
    enterExplore, exitExplore, resetGame,
  } = useChessGame()

  const { evaluatePosition, getAIMove } = useStockfish()

  // ── Captured pieces ───────────────────────────────────────────────────────
  // capturedByWhite = black pieces white took; capturedByBlack = white pieces black took
  const { capturedByWhite, capturedByBlack } = useMemo(() => {
    const byWhite = [], byBlack = []
    moveHistory.forEach(m => {
      if (m.captured) {
        if (m.color === 'w') byWhite.push(m.captured)
        else                 byBlack.push(m.captured)
      }
    })
    return { capturedByWhite: byWhite, capturedByBlack: byBlack }
  }, [moveHistory])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setOptionSquares({})
  }, [])

  const getOptionSquares = useCallback((square) => {
    const game  = getGame()
    const moves = game.moves({ square, verbose: true })
    if (!moves.length) return {}
    const squares = {}
    moves.forEach(({ to }) => {
      const hit = game.get(to)
      squares[to] = hit
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
    setShowBestMove(false)
    setLastMove({ from: move.from, to: move.to })
    setMoveScore(null)
    setIsAnalyzing(true)

    const fenAfterUserMove = getGame().fen()

    try {
      const { bestMove, score: bestScore } = await evaluatePosition(fenBeforeMove, EVAL_DEPTH)
      const { score: userScore }           = await evaluatePosition(fenAfterUserMove, EVAL_DEPTH)

      // bestScore: side-to-move POV at fenBeforeMove (e.g. white)
      // userScore: side-to-move POV at fenAfterUserMove (opponent) — opposite sign
      // white's advantage after move = -userScore, so cpLoss = bestScore - (-userScore)
      const cpLoss = Math.max(0, bestScore + userScore)

      // --- ORIGINAL scoring logic (reverted) ---
      // isBestMove is true only when the UCI move string matches exactly
      const isBestMove = !bestMove || bestMove === (move.from + move.to)

      let bestMoveSan = null
      if (bestMove && bestMove !== move.from + move.to) {
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
        bestMoveSan,
        bestMoveUci: bestMove,        // raw UCI for "Show Best Move" highlighting
        isBestMove,
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
      setShowBestMove(false)
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
    setShowBestMove(false)
    setIsThinking(false)
    setIsAnalyzing(false)
    setPlayerColor(color)
    setShowSetup(false)
  }, [resetGame, clearSelection])

  // ── Derived: best-move highlight squares ─────────────────────────────────

  const bestMoveSquares = showBestMove && moveScore?.bestMoveUci
    ? {
        from: moveScore.bestMoveUci.slice(0, 2),
        to:   moveScore.bestMoveUci.slice(2, 4),
      }
    : null

  // ── Captured pieces layout (depends on board orientation) ────────────────
  // Top player's row shows pieces THEY captured; bottom player's row shows pieces THEY captured.
  // When playing as white (white = bottom): top = opponent (black) captures; bottom = you (white) captures
  const topCaptures    = playerColor === 'black'
    ? { pieces: capturedByWhite, pieceColor: 'black' }   // top = opponent (white) captured black
    : { pieces: capturedByBlack, pieceColor: 'white' }   // top = opponent (black) captured white
  const bottomCaptures = playerColor === 'black'
    ? { pieces: capturedByBlack, pieceColor: 'white' }   // bottom = you (black) captured white
    : { pieces: capturedByWhite, pieceColor: 'black' }   // bottom = you (white) captured black

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
          <div className="player-row">
            <div className="player-label opponent">
              {playerColor === 'black' ? 'You (Black)' : opponentLabel}
            </div>
            <CapturedPieces pieces={topCaptures.pieces} pieceColor={topCaptures.pieceColor} />
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
            bestMoveSquares={bestMoveSquares}
            playerColor={playerColor || 'white'}
            boardOrientation={playerColor === 'black' ? 'black' : 'white'}
          />

          <div className="player-row">
            <div className="player-label you">
              {playerColor === 'black' ? opponentLabel : 'You (White)'}
            </div>
            <CapturedPieces pieces={bottomCaptures.pieces} pieceColor={bottomCaptures.pieceColor} />
          </div>
        </div>

        <ScoringSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          moveScore={moveScore}
          isAnalyzing={isAnalyzing}
          isExploring={isExploring}
          showBestMove={showBestMove}
          onToggleBestMove={() => setShowBestMove(v => !v)}
          onExplore={() => { enterExplore(); setSidebarOpen(true) }}
          onReturn={exitExplore}
        />
      </main>
    </div>
  )
}
