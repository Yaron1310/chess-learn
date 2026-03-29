import { useCallback, useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import './GameBoard.css'

export default function GameBoard({
  fen,
  onMove,
  onSquareClick,
  isThinking,
  gameOver,
  isExploring,
  lastMove,
  selectedSquare,
  optionSquares,
  playerColor,
  boardOrientation,
}) {
  const calcWidth = () => {
    // On mobile use 16px padding each side (32px total), desktop 40px total
    const padding = window.innerWidth <= 700 ? 32 : 40
    return Math.min(560, window.innerWidth - padding)
  }

  const [boardWidth, setBoardWidth] = useState(calcWidth)

  useEffect(() => {
    const handleResize = () => setBoardWidth(calcWidth())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isDraggable = useCallback(({ piece }) => {
    if (isThinking || gameOver) return false
    const playerChar = playerColor === 'white' ? 'w' : 'b'
    return piece.startsWith(playerChar)
  }, [isThinking, gameOver, playerColor])

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    const promotion = piece[1]?.toLowerCase() === 'p' &&
      (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined
    return onMove({ from: sourceSquare, to: targetSquare, promotion })
  }, [onMove])

  // Merge last-move highlights + selected square + valid move dots
  const squareStyles = {}
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 214, 10, 0.3)' }
    squareStyles[lastMove.to]   = { backgroundColor: 'rgba(255, 214, 10, 0.3)' }
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = { backgroundColor: 'rgba(79, 142, 247, 0.5)' }
  }
  Object.assign(squareStyles, optionSquares)

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
          {gameOver.winner
            ? `${gameOver.winner} wins by ${gameOver.reason}!`
            : gameOver.reason}
        </div>
      )}

      <Chessboard
        id="main-board"
        boardWidth={boardWidth}
        position={fen}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
        isDraggablePiece={isDraggable}
        customSquareStyles={squareStyles}
        boardOrientation={boardOrientation || 'white'}
        animationDuration={200}
        customBoardStyle={{
          borderRadius: '6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
