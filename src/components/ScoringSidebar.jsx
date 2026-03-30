import { scoreToCategory } from '../hooks/useStockfish'
import './ScoringSidebar.css'

function ScoreBar({ score }) {
  return (
    <div className="score-bar-track">
      <div
        className="score-bar-fill"
        style={{ width: `${score}%`, backgroundColor: scoreToCategory(score).color }}
      />
      <span className="score-bar-label">{score}%</span>
    </div>
  )
}

function MoveScoreCard({ moveData }) {
  const { score, cpLoss, moveSan, bestMoveSan, isBestMove } = moveData
  const category = scoreToCategory(score)

  return (
    <div className="move-score-card">
      <div className="move-score-header">
        <span className="move-san">{moveSan}</span>
        <span className="move-symbol" style={{ color: category.color }}>
          {category.symbol}
        </span>
        <span className="move-category" style={{ color: category.color }}>
          {category.label}
        </span>
      </div>

      <ScoreBar score={score} />

      <div className="move-score-details">
        <div className="detail-row">
          <span className="detail-label">Your move</span>
          <span className="detail-value">{moveSan}</span>
        </div>
        {!isBestMove && bestMoveSan && (
          <div className="detail-row best-move">
            <span className="detail-label">Best move was</span>
            <span className="detail-value highlight">{bestMoveSan}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Centipawn loss</span>
          <span className="detail-value">{cpLoss > 0 ? `−${cpLoss}` : '0'}</span>
        </div>
      </div>
    </div>
  )
}

export default function ScoringSidebar({
  isOpen,
  onToggle,
  moveScore,
  isAnalyzing,
  isExploring,
  showBestMove,
  onToggleBestMove,
  onExplore,
  onReturn,
}) {
  // Show "best move" button only when there is a non-best move to highlight
  const canShowBestMove = moveScore && !moveScore.isBestMove && moveScore.bestMoveUci

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'} ${isExploring ? 'exploring' : ''}`}>
      {/* Toggle tab — vertical on desktop, horizontal bar on mobile */}
      <button className="sidebar-toggle" onClick={onToggle} title={isOpen ? 'Collapse' : 'Expand'}>
        <span className="toggle-label">
          {isExploring ? '🔀 Branch Analysis' : '📊 Move Analysis'}
        </span>
        <span className="toggle-arrow">{isOpen ? '›' : '‹'}</span>
      </button>

      {isOpen && (
        <div className="sidebar-content">
          <div className="sidebar-title-row">
            <h2 className="sidebar-title">
              {isExploring ? '🔀 Exploring Branch' : '📊 Move Analysis'}
            </h2>
            <button className="sidebar-close-btn" onClick={onToggle} title="Close">✕</button>
          </div>

          <div className="sidebar-body">
            {isAnalyzing ? (
              <div className="analyzing-state">
                <div className="analyzing-spinner" />
                <p>Analyzing move...</p>
              </div>
            ) : moveScore ? (
              <MoveScoreCard moveData={moveScore} />
            ) : (
              <div className="empty-state">
                <p>Make a move to see analysis</p>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            {isExploring ? (
              <button className="explore-btn return" onClick={onReturn}>
                ↩ Return to Game
              </button>
            ) : (
              <>
                <button
                  className="explore-btn explore"
                  onClick={onExplore}
                  disabled={!moveScore && !isAnalyzing}
                  title="Explore this position in a branch without affecting your main game"
                >
                  🔀 Explore
                </button>

                {canShowBestMove && (
                  <button
                    className={`explore-btn best-move-btn ${showBestMove ? 'active' : ''}`}
                    onClick={onToggleBestMove}
                    title="Highlight the best move on the board"
                  >
                    {showBestMove ? '🟢 Hide Best Move' : '💡 Show Best Move'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
