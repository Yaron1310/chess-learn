import { useState, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'

export function useChessGame() {
  // Main game instance (always the real game)
  const mainGameRef = useRef(new Chess())

  // Explore snapshot — saved when user enters explore mode
  const exploreSnapshotRef = useRef(null)

  const [fen, setFen]           = useState(mainGameRef.current.fen())
  const [isExploring, setIsExploring] = useState(false)
  const [gameOver, setGameOver] = useState(null) // null | { reason, winner }
  const [moveHistory, setMoveHistory] = useState([]) // array of move objects

  // Returns the active Chess instance (explore branch or main game)
  const getGame = useCallback(() => mainGameRef.current, [])

  const checkGameOver = useCallback((game) => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      setGameOver({ reason: 'Checkmate', winner })
      return true
    }
    if (game.isDraw()) {
      let reason = 'Draw'
      if (game.isStalemate())            reason = 'Stalemate'
      else if (game.isThreefoldRepetition()) reason = 'Threefold Repetition'
      else if (game.isInsufficientMaterial()) reason = 'Insufficient Material'
      setGameOver({ reason, winner: null })
      return true
    }
    return false
  }, [])

  // Make a move on the active board. Returns the move object or null if illegal.
  const makeMove = useCallback((moveInput) => {
    const game = mainGameRef.current
    try {
      const move = game.move(moveInput)
      if (!move) return null
      const newFen = game.fen()
      setFen(newFen)
      if (!isExploring) {
        setMoveHistory(prev => [...prev, { ...move, fen: newFen }])
      }
      checkGameOver(game)
      return move
    } catch {
      return null
    }
  }, [isExploring, checkGameOver])

  // Enter explore mode: snapshot current state, continue playing freely
  const enterExplore = useCallback(() => {
    exploreSnapshotRef.current = {
      fen: mainGameRef.current.fen(),
      history: mainGameRef.current.history({ verbose: true }),
    }
    setIsExploring(true)
  }, [])

  // Return from explore mode: restore snapshot
  const exitExplore = useCallback(() => {
    if (!exploreSnapshotRef.current) return
    const { fen: snapFen, history } = exploreSnapshotRef.current

    const restoredGame = new Chess(snapFen)
    mainGameRef.current = restoredGame

    setFen(snapFen)
    setMoveHistory(history.map((m, i) => ({ ...m, fen: snapFen })))
    setIsExploring(false)
    exploreSnapshotRef.current = null
    setGameOver(null)
  }, [])

  const resetGame = useCallback(() => {
    mainGameRef.current = new Chess()
    exploreSnapshotRef.current = null
    setFen(mainGameRef.current.fen())
    setIsExploring(false)
    setGameOver(null)
    setMoveHistory([])
  }, [])

  return {
    fen,
    isExploring,
    gameOver,
    moveHistory,
    getGame,
    makeMove,
    enterExplore,
    exitExplore,
    resetGame,
  }
}
