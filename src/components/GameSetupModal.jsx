import { useState } from 'react'
import { SKILL_LEVELS } from '../hooks/useStockfish'
import './GameSetupModal.css'

export default function GameSetupModal({ skillLevel, onSelect }) {
  const [localSkill, setLocalSkill] = useState(skillLevel)

  const pick = (color) => {
    const resolvedColor = color === 'random'
      ? (Math.random() < 0.5 ? 'white' : 'black')
      : color
    onSelect(resolvedColor, localSkill)
  }

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <div className="setup-icon">♟</div>
        <h2 className="setup-title">New Game</h2>

        <div className="setup-section">
          <p className="setup-section-label">Difficulty</p>
          <div className="setup-skill-buttons">
            {SKILL_LEVELS.map((level, i) => (
              <button
                key={level.label}
                className={`setup-skill-btn ${localSkill === i ? 'active' : ''}`}
                onClick={() => setLocalSkill(i)}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <p className="setup-section-label">Play as</p>
          <div className="setup-color-buttons">
            <button className="setup-btn white-btn" onClick={() => pick('white')}>
              <span className="piece-icon">♔</span>
              <span>White</span>
              <span className="setup-hint">Move first</span>
            </button>
            <button className="setup-btn random-btn" onClick={() => pick('random')}>
              <span className="piece-icon">🎲</span>
              <span>Random</span>
              <span className="setup-hint">Surprise me</span>
            </button>
            <button className="setup-btn black-btn" onClick={() => pick('black')}>
              <span className="piece-icon">♚</span>
              <span>Black</span>
              <span className="setup-hint">Move second</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
