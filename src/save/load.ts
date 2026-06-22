import type { GameState } from '../types/state'
import { validateGameState } from './validate'

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
        const raw: unknown = JSON.parse(reader.result as string)
        const result = validateGameState(raw)
        if (!result.ok) {
          alert(`Invalid save file:\n\n${result.errors.join('\n')}`)
          return
        }
        onLoad(raw as GameState)
      } catch {
        alert('Save file is not valid JSON.')
      }
    })
    reader.readAsText(file)
  })

  input.click()
}
