// Stockfish Web Worker
// Loads the Stockfish engine and exposes a message-based UCI interface.
// The main thread sends commands as strings; the worker forwards responses.

let stockfish = null

function initStockfish() {
  return new Promise((resolve) => {
    importScripts('/stockfish-18-lite-single.js')

    stockfish = Stockfish()

    stockfish.addMessageHandler((line) => {
      self.postMessage({ type: 'output', line })
    })

    stockfish.postMessage('uci')
    resolve()
  })
}

self.onmessage = async (e) => {
  const { type, command } = e.data

  if (type === 'init') {
    await initStockfish()
    self.postMessage({ type: 'ready' })
    return
  }

  if (type === 'command' && stockfish) {
    stockfish.postMessage(command)
  }
}
