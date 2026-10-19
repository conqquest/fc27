import { useRef, useEffect } from 'react'

export interface InputState {
  keys: Set<string>
  mouseButtons: Set<number>
  mousePos: { x: number; y: number }
  mouseClick: { button: number; x: number; y: number } | null
}

export function useInput(): InputState {
  const stateRef = useRef<InputState>({
    keys: new Set(),
    mouseButtons: new Set(),
    mousePos: { x: 0, y: 0 },
    mouseClick: null,
  })

  useEffect(() => {
    const state = stateRef.current

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game keys
      const gameKeys = ['Tab', 'Escape', ' ']
      if (gameKeys.includes(e.key)) e.preventDefault()
      state.keys.add(e.key.toLowerCase())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      state.keys.delete(e.key.toLowerCase())
    }

    const onBlur = () => {
      state.keys.clear()
      state.mouseButtons.clear()
    }

    const onMouseDown = (e: MouseEvent) => {
      state.mouseButtons.add(e.button)
      state.mouseClick = { button: e.button, x: e.clientX, y: e.clientY }
    }

    const onMouseUp = (e: MouseEvent) => {
      state.mouseButtons.delete(e.button)
    }

    const onMouseMove = (e: MouseEvent) => {
      state.mousePos = { x: e.clientX, y: e.clientY }
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('contextmenu', onContextMenu)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])

  return stateRef.current
}

export function isKeyHeld(input: InputState, binding: string): boolean {
  return input.keys.has(binding.toLowerCase())
}
