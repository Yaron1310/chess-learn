import { useEffect, useRef, useCallback } from 'react'

// Stockfish skill level mapping (0–20 internal scale)
export const SKILL_LEVELS = [
  { label: 'Beginner',     depth: 1,  skill: 1  },
  { label: 'Casual',       depth: 3,  skill: 5  },
  { label: 'Intermediate', depth: 5,  skill: 10 },
  { label: 'Advanced',     depth: 8,  skill: 15 },
  { label: 'Master',       depth: 15, skill: 20 },
]

// Converts centipawn loss to a 1–100 quality score
export function cpLossToScore(cpLoss) {
  if (cpLoss <= 0) return 100
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
  // stockfish-18-lite-single.js is designed to run AS a Web Worker.
  // It receives plain UCI strings via postMessage and emits output the same way.
  const workerRef   = useRef(null)
  const readyRef    = useRef(false)
  const pendingRef  = useRef([])     // commands queued before 'uciok'
  const callbackRef = useRef(null)   // current one-shot output listener

  useEffect(() => {
    // Use ASM.js (pure JS) version — no WASM, works in any browser
    const worker = new Worker('/stockfish-18-asm.js')
    workerRef.current = worker

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      console.log('[Stockfish →]', line)

      // Engine is ready once we receive 'uciok'
      if (!readyRef.current && line === 'uciok') {
        console.log('[Stockfish] Engine ready, flushing', pendingRef.current.length, 'queued commands')
        readyRef.current = true
        pendingRef.current.forEach(cmd => worker.postMessage(cmd))
        pendingRef.current = []
        return
      }

      if (callbackRef.current) {
        callbackRef.current(line)
      }
    }

    worker.onerror = (err) => console.error('[Stockfish] Worker error:', err)

    console.log('[Stockfish] Sending uci handshake...')
    worker.postMessage('uci')

    return () => worker.terminate()
  }, [])

  const send = useCallback((command) => {
    if (!readyRef.current) {
      console.log('[Stockfish] Queuing (not ready yet):', command)
      pendingRef.current.push(command)
    } else {
      console.log('[Stockfish ←]', command)
      workerRef.current?.postMessage(command)
    }
  }, [])

  // Evaluate a position at the given depth.
  // Resolves: { bestMove, score (centipawns, white-positive) }
  const evaluatePosition = useCallback((fen, depth = 12) => {
    return new Promise((resolve) => {
      let bestMove = null
      let score = 0

      callbackRef.current = (line) => {
        if (line.startsWith('info') && line.includes('score')) {
          const cpMatch   = line.match(/score cp (-?\d+)/)
          const mateMatch = line.match(/score mate (-?\d+)/)
          if (cpMatch)   score = parseInt(cpMatch[1], 10)
          if (mateMatch) score = parseInt(mateMatch[1], 10) > 0 ? 100000 : -100000
        }
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          bestMove = parts[1] === '(none)' ? null : parts[1]
          callbackRef.current = null
          resolve({ bestMove, score })
        }
      }

      send(`position fen ${fen}`)
      send(`go depth ${depth}`)
    })
  }, [send])

  // Ask Stockfish to pick a move for the AI at a given skill level index.
  const getAIMove = useCallback((fen, skillLevelIndex) => {
    const { skill, depth } = SKILL_LEVELS[skillLevelIndex]

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
