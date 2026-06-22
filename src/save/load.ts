import type { GameState } from '../types/state'

export function loadGame(onLoad: (state: GameState) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      try {
        const state = JSON.parse(reader.result as string) as GameState
        onLoad(state)
      } catch {
        alert('Invalid save file.')
      }
    })
    reader.readAsText(file)
  })

  input.click()
}
