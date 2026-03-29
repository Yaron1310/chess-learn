import { useState, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'

export function useChessGame() {
  const mainGameRef = useRef(new Chess())
  const exploreSnapshotRef = useRef(null)

  const [fen, setFen]               = useState(mainGameRef.current.fen())
  const [isExploring, setIsExploring] = useState(false)
  const [gameOver, setGameOver]     = useState(null)
  const [moveHistory, setMoveHistory] = useState([])

  const getGame = useCallback(() => mainGameRef.current, [])

  const checkGameOver = useCallback((game) => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      setGameOver({ reason: 'Checkmate', winner })
      return true
    }
    if (game.isDraw()) {
      let reason = 'Draw'
      if (game.isStalemate())               reason = 'Stalemate'
      else if (game.isThreefoldRepetition()) reason = 'Threefold Repetition'
      else if (game.isInsufficientMaterial()) reason = 'Insufficient Material'
      setGameOver({ reason, winner: null })
      return true
    }
    return false
  }, [])

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

  // Undo the last N half-moves. In explore mode, undoes 1; in main game, undoes 2 (player + AI).
  const undoMove = useCallback((halfMoves = 2) => {
    const game = mainGameRef.current
    let undone = false
    for (let i = 0; i < halfMoves; i++) {
      const m = game.undo()
      if (m) undone = true
      else break
    }
    if (undone) {
      setFen(game.fen())
      setGameOver(null)
      setMoveHistory(game.history({ verbose: true }))
    }
    return undone
  }, [])

  const enterExplore = useCallback(() => {
    exploreSnapshotRef.current = {
      fen: mainGameRef.current.fen(),
      history: mainGameRef.current.history({ verbose: true }),
    }
    setIsExploring(true)
  }, [])

  const exitExplore = useCallback(() => {
    if (!exploreSnapshotRef.current) return
    const { fen: snapFen, history } = exploreSnapshotRef.current
    mainGameRef.current = new Chess(snapFen)
    setFen(snapFen)
    setMoveHistory(history)
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
    undoMove,
    enterExplore,
    exitExplore,
    resetGame,
  }
}
