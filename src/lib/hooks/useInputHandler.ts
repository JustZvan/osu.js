import React from 'react'
import { InputHandler } from '../InputHandler'

export default function useInputHandler() {
  const [mouseX, setMouseX] = React.useState(0)
  const [mouseY, setMouseY] = React.useState(0)
  const inputHandlerRef = React.useRef<InputHandler | null>(null)

  if (!inputHandlerRef.current) {
    inputHandlerRef.current = new InputHandler((x, y) => {
      setMouseX(x)
      setMouseY(y)
    })
  }

  React.useEffect(() => {
    return () => {
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy()
        inputHandlerRef.current = null
      }
    }
  }, [])

  return {
    ...inputHandlerRef.current,
    mouseX,
    mouseY,
  }
}
