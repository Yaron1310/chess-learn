import { SKILL_LEVELS } from '../hooks/useStockfish'
import './SkillSelector.css'

export default function SkillSelector({ selected, onChange, disabled }) {
  return (
    <div className="skill-selector">
      <span className="skill-label">Difficulty:</span>
      <div className="skill-buttons">
        {SKILL_LEVELS.map((level, i) => (
          <button
            key={level.label}
            className={`skill-btn ${selected === i ? 'active' : ''}`}
            onClick={() => onChange(i)}
            disabled={disabled}
            title={`Stockfish Skill ${level.skill}`}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}
