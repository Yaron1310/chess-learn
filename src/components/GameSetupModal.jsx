import './GameSetupModal.css'

export default function GameSetupModal({ onSelect }) {
  const handleRandom = () => {
    onSelect(Math.random() < 0.5 ? 'white' : 'black')
  }

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <div className="setup-icon">♟</div>
        <h2 className="setup-title">Choose Your Color</h2>
        <p className="setup-subtitle">You will play against Stockfish</p>
        <div className="setup-buttons">
          <button className="setup-btn white-btn" onClick={() => onSelect('white')}>
            <span className="piece-icon">♔</span>
            <span>White</span>
            <span className="setup-hint">Move first</span>
          </button>
          <button className="setup-btn random-btn" onClick={handleRandom}>
            <span className="piece-icon">🎲</span>
            <span>Random</span>
            <span className="setup-hint">Surprise me</span>
          </button>
          <button className="setup-btn black-btn" onClick={() => onSelect('black')}>
            <span className="piece-icon">♚</span>
            <span>Black</span>
            <span className="setup-hint">Move second</span>
          </button>
        </div>
      </div>
    </div>
  )
}
