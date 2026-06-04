'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export const useTrainingProgress = () => {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [isError, setIsError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const start = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsError(false)
    setVisible(true)
    setProgress(0)
    // Double rAF: garante que o valor 0 é renderizado antes de animar para 85
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setProgress(85))
    )
  }, [])

  const complete = useCallback(() => {
    setProgress(100)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 700)
  }, [])

  const fail = useCallback(() => {
    setIsError(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
      setIsError(false)
    }, 500)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { progress, visible, isError, start, complete, fail }
}
