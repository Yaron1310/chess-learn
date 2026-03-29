import { useCallback, useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import './GameBoard.css'

export default function GameBoard({
  fen,
  onMove,
  isThinking,
  gameOver,
  isExploring,
  lastMove,
}) {
  const [boardWidth, setBoardWidth] = useState(Math.min(560, window.innerWidth - 40))

  useEffect(() => {
    const handleResize = () => {
      setBoardWidth(Math.min(560, window.innerWidth - 40))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isDraggable = useCallback(({ piece }) => {
    // Only allow moving white pieces (user plays white), and only when not thinking
    return !isThinking && !gameOver && piece.startsWith('w')
  }, [isThinking, gameOver])

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    const promotion = piece[1]?.toLowerCase() === 'p' &&
      (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined

    return onMove({ from: sourceSquare, to: targetSquare, promotion })
  }, [onMove])

  // Highlight squares for last move
  const customSquareStyles = {}
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 214, 10, 0.35)' }
    customSquareStyles[lastMove.to]   = { backgroundColor: 'rgba(255, 214, 10, 0.35)' }
  }

  return (
    <div className="board-wrapper">
      {isExploring && (
        <div className="explore-banner">
          Exploring branch — moves here won't affect your main game
        </div>
      )}

      {isThinking && (
        <div className="thinking-overlay">
          <div className="thinking-spinner" />
          <span>Computer is thinking...</span>
        </div>
      )}

      {gameOver && (
        <div className="gameover-banner">
          {gameOver.winner ? `${gameOver.winner} wins by ${gameOver.reason}!` : gameOver.reason}
        </div>
      )}

      <Chessboard
        id="main-board"
        boardWidth={boardWidth}
        position={fen}
        onPieceDrop={onDrop}
        isDraggablePiece={isDraggable}
        customSquareStyles={customSquareStyles}
        animationDuration={200}
        customBoardStyle={{
          borderRadius: '6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
