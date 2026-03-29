import './CapturedPieces.css'

const PIECE_VALUE = { q: 9, r: 5, b: 3, n: 3, p: 1 }

const SYMBOLS = {
  white: { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', k: '♔' },
  black: { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟', k: '♚' },
}

export default function CapturedPieces({ pieces, pieceColor }) {
  if (!pieces || pieces.length === 0) return <div className="captured-pieces" />

  const sorted = [...pieces].sort((a, b) => (PIECE_VALUE[b] ?? 0) - (PIECE_VALUE[a] ?? 0))

  return (
    <div className="captured-pieces">
      {sorted.map((type, i) => (
        <span key={i} className={`captured-piece cp-${pieceColor}`}>
          {SYMBOLS[pieceColor]?.[type] ?? '?'}
        </span>
      ))}
    </div>
  )
}
