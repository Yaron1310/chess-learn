import { useEffect, useRef, useCallback } from 'react'

// Stockfish skill level mapping (0–20 internal scale)
export const SKILL_LEVELS = [
  { label: 'Beginner',     depth: 1,  skill: 1  },
  { label: 'Casual',       depth: 3,  skill: 5  },
  { label: 'Intermediate', depth: 5,  skill: 10 },
  { label: 'Advanced',     depth: 8,  skill: 15 },
  { label: 'Master',       depth: 15, skill: 20 },
]

// Converts centipawn loss to a 1-100 quality score
// cp_loss = 0 → 100%, large loss → approaches 1%
export function cpLossToScore(cpLoss) {
  if (cpLoss <= 0) return 100
  // Exponential decay: each 100cp loss roughly halves the score
  const score = Math.round(100 * Math.exp(-cpLoss / 150))
  return Math.max(1, Math.min(100, score))
}

export function scoreToCategory(score) {
  if (score >= 95) return { label: 'Brilliant!', color: '#00b4d8', symbol: '!!' }
  if (score >= 80) return { label: 'Good',       color: '#52b788', symbol: '!'  }
  if (score >= 60) return { label: 'Inaccuracy', color: '#f4d03f', symbol: '?!' }
  if (score >= 35) return { label: 'Mistake',    color: '#f39c12', symbol: '?'  }
  return               { label: 'Blunder',    color: '#e74c3c', symbol: '??' }
}

export function useStockfish() {
  const workerRef = useRef(null)
  const readyRef  = useRef(false)
  const pendingRef = useRef([])       // commands queued before init completes
  const callbackRef = useRef(null)    // current one-shot output listener

  useEffect(() => {
    const worker = new Worker(new URL('../workers/stockfish.worker.js', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { type, line } = e.data

      if (type === 'ready') {
        readyRef.current = true
        // flush queued commands
        pendingRef.current.forEach(cmd => worker.postMessage({ type: 'command', command: cmd }))
        pendingRef.current = []
        return
      }

      if (type === 'output' && callbackRef.current) {
        callbackRef.current(line)
      }
    }

    worker.postMessage({ type: 'init' })

    return () => {
      worker.terminate()
    }
  }, [])

  const send = useCallback((command) => {
    if (!readyRef.current) {
      pendingRef.current.push(command)
    } else {
      workerRef.current?.postMessage({ type: 'command', command })
    }
  }, [])

  // Returns a promise that resolves with the best move evaluation
  // Given a FEN, asks Stockfish to evaluate the best move at given depth.
  // Resolves: { bestMove: 'e2e4', score: <centipawns from white's perspective> }
  const evaluatePosition = useCallback((fen, depth = 12) => {
    return new Promise((resolve) => {
      let bestMove = null
      let score = 0
      let isMate = false

      callbackRef.current = (line) => {
        // Parse score from info lines
        if (line.startsWith('info') && line.includes('score')) {
          const cpMatch  = line.match(/score cp (-?\d+)/)
          const mateMatch = line.match(/score mate (-?\d+)/)
          if (cpMatch)   { score = parseInt(cpMatch[1], 10);  isMate = false }
          if (mateMatch) { score = parseInt(mateMatch[1], 10) > 0 ? 100000 : -100000; isMate = true }
        }

        // Final best move answer
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          bestMove = parts[1] === '(none)' ? null : parts[1]
          callbackRef.current = null
          resolve({ bestMove, score, isMate })
        }
      }

      send(`position fen ${fen}`)
      send(`go depth ${depth}`)
    })
  }, [send])

  // Asks Stockfish to pick a move for the AI at a given skill level
  // Returns: { bestMove: 'e2e4' }
  const getAIMove = useCallback((fen, skillLevel) => {
    const { skill, depth } = SKILL_LEVELS[skillLevel]

    return new Promise((resolve) => {
      callbackRef.current = (line) => {
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          const move = parts[1] === '(none)' ? null : parts[1]
          callbackRef.current = null
          resolve({ bestMove: move })
        }
      }

      send(`setoption name Skill Level value ${skill}`)
      send(`position fen ${fen}`)
      send(`go depth ${depth}`)
    })
  }, [send])

  return { evaluatePosition, getAIMove, send }
}
